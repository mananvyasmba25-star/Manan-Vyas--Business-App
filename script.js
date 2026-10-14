/* LoadMatch website JavaScript
   Includes route estimation, pricing, booking-date selection,
   booking confirmation preview, and enquiry form demonstration.

   This is a front-end prototype. It does not reserve a vehicle
   or send/store bookings on a server.
*/

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const CONFIG = {
    baseRatePerKm: 20,
    minimumBaseFare: 500,
    lclFee: 100,
    priorityFee: 700
  };

  const KNOWN_PINS = {
    '380001': { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0258, lon: 72.5873 },
    '380015': { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0121, lon: 72.5262 },
    '395003': { city: 'Surat', state: 'Gujarat', lat: 21.2050, lon: 72.8400 },
    '390001': { city: 'Vadodara', state: 'Gujarat', lat: 22.3000, lon: 73.2000 },
    '360001': { city: 'Rajkot', state: 'Gujarat', lat: 22.3000, lon: 70.7833 },
    '382010': { city: 'Gandhinagar', state: 'Gujarat', lat: 23.2156, lon: 72.6369 },
    '364001': { city: 'Bhavnagar', state: 'Gujarat', lat: 21.7650, lon: 72.1360 },
    '302001': { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lon: 75.7873 },
    '342001': { city: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lon: 73.0243 },
    '313001': { city: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lon: 73.7125 },
    '324001': { city: 'Kota', state: 'Rajasthan', lat: 25.2138, lon: 75.8648 },
    '305001': { city: 'Ajmer', state: 'Rajasthan', lat: 26.4499, lon: 74.6399 },
    '334001': { city: 'Bikaner', state: 'Rajasthan', lat: 28.0229, lon: 73.3119 }
  };

  const byId = id => document.getElementById(id);
  const plannerForm = byId('planner-form');
  const enquiryForm = byId('enquiry-form');
  const bookingForm = byId('booking-form');

  const state = {
    pickup: null,
    delivery: null
  };

  // Use the visitor's local date to prevent selecting past dates.
  function localDateISO() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  function money(value) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Math.round(value));
  }

  // Escape user-entered text before placing it in HTML.
  function safeText(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function cleanPin(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 6);
  }

  function selectedValue(name) {
    const selected = document.querySelector(
      `input[name="${name}"]:checked`
    );

    return selected ? selected.value : '';
  }

  function showError(message) {
    const box = byId('form-error');

    if (!box) return;

    box.textContent = message;
    box.classList.remove('hidden');
  }

  function hideError() {
    const box = byId('form-error');

    if (!box) return;

    box.textContent = '';
    box.classList.add('hidden');
  }

  function setHint(id, message, status) {
    const element = byId(id);

    if (!element) return;

    element.textContent = message;
    element.className = `field-hint ${status || ''}`.trim();
  }

  // Hide and reset the booking interface when trip details change.
  function hideBookingPanel() {
    const panel = byId('booking-panel');
    const confirmation = byId('booking-confirmation');
    const error = byId('booking-error');

    if (panel) {
      panel.classList.add('hidden');
    }

    if (confirmation) {
      confirmation.classList.add('hidden');
      confirmation.textContent = '';
    }

    if (error) {
      error.classList.add('hidden');
      error.textContent = '';
    }
  }

  // Look up the geographical coordinates of a location.
  async function geocode(query) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(7000) }
      );

      if (!response.ok) return null;

      const data = await response.json();

      if (!data.length) return null;

      return {
        lat: Number(data[0].lat),
        lon: Number(data[0].lon)
      };
    } catch (_error) {
      return null;
    }
  }

  // Validate a six-digit PIN and find its district/state.
  async function lookupPin(pin) {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('Enter a valid six-digit PIN code.');
    }

    if (KNOWN_PINS[pin]) {
      return {
        pin,
        ...KNOWN_PINS[pin]
      };
    }

    let response;

    try {
      response = await fetch(
        `https://api.postalpincode.in/pincode/${pin}`,
        { signal: AbortSignal.timeout(7000) }
      );
    } catch (_error) {
      throw new Error(
        'PIN lookup is unavailable. Try a listed demo PIN code or check your connection.'
      );
    }

    if (!response.ok) {
      throw new Error('PIN lookup service is unavailable.');
    }

    const data = await response.json();
    const office =
      data &&
      data[0] &&
      data[0].PostOffice &&
      data[0].PostOffice[0];

    if (!office) {
      throw new Error('PIN code not found. Please check the number.');
    }

    if (!['Gujarat', 'Rajasthan'].includes(office.State)) {
      throw new Error(
        'This prototype currently supports Gujarat and Rajasthan only.'
      );
    }

    const city = office.District || office.Block || office.Name;
    const coords = await geocode(
      `${pin}, ${city}, ${office.State}, India`
    );

    return {
      pin,
      city,
      state: office.State,
      lat: coords ? coords.lat : null,
      lon: coords ? coords.lon : null
    };
  }

  async function validatePin(inputId, hintId, stateKey) {
    const input = byId(inputId);

    if (!input) return false;

    const pin = cleanPin(input.value);
    input.value = pin;
    state[stateKey] = null;

    if (pin.length !== 6) {
      setHint(hintId, 'Enter a six-digit PIN code.', 'invalid');
      return false;
    }

    setHint(hintId, 'Checking PIN code…', '');

    try {
      const place = await lookupPin(pin);

      state[stateKey] = place;

      setHint(
        hintId,
        `${place.city}, ${place.state}`,
        'valid'
      );

      return true;
    } catch (error) {
      setHint(hintId, error.message, 'invalid');
      return false;
    }
  }

  // Calculate straight-line distance between coordinates.
  function haversineKm(a, b) {
    const radians = degrees => degrees * Math.PI / 180;

    const dLat = radians(b.lat - a.lat);
    const dLon = radians(b.lon - a.lon);

    const value =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(dLon / 2) ** 2;

    return 6371 * 2 *
      Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  // Get road distance through OSRM, with an approximate fallback.
  async function routeEstimate(pickup, delivery) {
    let p = pickup;
    let d = delivery;

    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) {
      const coords = await geocode(
        `${p.pin}, ${p.city}, ${p.state}, India`
      );

      if (coords) p = { ...p, ...coords };
    }

    if (!Number.isFinite(d.lat) || !Number.isFinite(d.lon)) {
      const coords = await geocode(
        `${d.pin}, ${d.city}, ${d.state}, India`
      );

      if (coords) d = { ...d, ...coords };
    }

    if (![p.lat, p.lon, d.lat, d.lon].every(Number.isFinite)) {
      throw new Error(
        'Could not locate one of the PIN-code areas. Please try again later.'
      );
    }

    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${p.lon},${p.lat};${d.lon},${d.lat}?overview=false`;

      const response = await fetch(
        url,
        { signal: AbortSignal.timeout(9000) }
      );

      if (!response.ok) {
        throw new Error('Route service unavailable');
      }

      const data = await response.json();
      const route = data && data.routes && data.routes[0];

      if (!route) {
        throw new Error('No route found');
      }

      return {
        distanceKm: route.distance / 1000,
        durationMinutes: route.duration / 60,
        note:
          'Road-network estimate between PIN-code areas. Actual time varies with traffic, tolls, loading and road conditions.'
      };
    } catch (_error) {
      const distanceKm = haversineKm(p, d) * 1.25;

      return {
        distanceKm,
        durationMinutes: distanceKm / 40 * 60,
        note:
          'Approximation only: straight-line distance adjusted by 25% and assumed driving speed of 40 km/h. This is not a live road route.'
      };
    }
  }

  function formatDuration(minutes) {
    if (!Number.isFinite(minutes)) {
      return 'Unavailable';
    }

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    return hours
      ? `${hours} hr ${mins} min`
      : `${mins} min`;
  }

  function validateContactFields() {
    const requiredFields = [
      ['pickup-address', 'Enter the pickup address.'],
      ['pickup-name', 'Enter the pickup contact person’s name.'],
      ['delivery-address', 'Enter the delivery address.'],
      ['delivery-name', 'Enter the delivery contact person’s name.']
    ];

    for (const [id, message] of requiredFields) {
      const field = byId(id);

      if (!field || !field.value.trim()) {
        if (field) field.focus();

        showError(message);

        return false;
      }
    }

    return true;
  }

  function updateLoadFeeNote() {
    const note = byId('load-fee-note');

    if (!note) return;

    note.innerHTML =
      selectedValue('loadType') === 'LCL'
        ? 'LCL charge: <strong>₹100</strong>'
        : 'FCL charge: <strong>₹0</strong> · No LCL fee added';
  }

  function updateChoiceStyle(input) {
    document
      .querySelectorAll(`input[name="${input.name}"]`)
      .forEach(radio => {
        const card = radio.closest('.choice-card');

        if (card) {
          card.classList.toggle('selected', radio.checked);
        }
      });
  }

  // -------------------------------
  // PRICE ESTIMATION
  // -------------------------------
  async function handleEstimate(event) {
    event.preventDefault();

    hideError();
    hideBookingPanel();

    if (!validateContactFields()) return;

    const pickupPin = cleanPin(byId('pickup-pin').value);
    const deliveryPin = cleanPin(byId('delivery-pin').value);

    byId('pickup-pin').value = pickupPin;
    byId('delivery-pin').value = deliveryPin;

    if (pickupPin.length !== 6 || deliveryPin.length !== 6) {
      showError(
        'Please enter valid six-digit pickup and delivery PIN codes.'
      );
      return;
    }

    if (pickupPin === deliveryPin) {
      showError(
        'Pickup and delivery PIN codes must be different.'
      );
      return;
    }

    const button = plannerForm
      ? plannerForm.querySelector('button[type="submit"]')
      : null;

    const originalButtonText = button ? button.innerHTML : '';

    if (button) {
      button.disabled = true;
      button.textContent = 'Calculating estimate…';
    }

    const estimateBox = byId('price-estimate');

    if (estimateBox) {
      estimateBox.classList.add('hidden');
    }

    try {
      const results = await Promise.all([
        validatePin('pickup-pin', 'pickup-location', 'pickup'),
        validatePin('delivery-pin', 'delivery-location', 'delivery')
      ]);

      if (!results[0] || !results[1]) {
        throw new Error(
          'Please correct the pickup and delivery PIN codes.'
        );
      }

      const route = await routeEstimate(
        state.pickup,
        state.delivery
      );

      const loadType = selectedValue('loadType') || 'LCL';
      const deliveryType =
        selectedValue('deliveryType') || 'Standard';

      const baseFare = Math.max(
        CONFIG.minimumBaseFare,
        route.distanceKm * CONFIG.baseRatePerKm
      );

      const loadFee =
        loadType === 'LCL' ? CONFIG.lclFee : 0;

      const deliveryFee =
        deliveryType === 'Priority'
          ? CONFIG.priorityFee
          : 0;

      const total = baseFare + loadFee + deliveryFee;

      byId('route-distance').textContent =
        `${route.distanceKm.toFixed(1)} km`;

      byId('route-time').textContent =
        `Approx. ${formatDuration(route.durationMinutes)}`;

      byId('route-note').textContent = route.note;
      byId('route-summary').classList.remove('hidden');

      byId('estimate-route').textContent =
        `${state.pickup.city}, ${state.pickup.state} (${pickupPin}) → ` +
        `${state.delivery.city}, ${state.delivery.state} (${deliveryPin})`;

      byId('estimated-total').textContent = money(total);

      byId('base-price').textContent =
        `${money(baseFare)} (${route.distanceKm.toFixed(1)} km × ₹20/km; ₹500 minimum)`;

      byId('load-fee-label').textContent =
        loadType === 'LCL' ? 'LCL flat charge' : 'FCL charge';

      byId('load-fee-price').textContent = money(loadFee);

      byId('delivery-fee-label').textContent =
        `${deliveryType} delivery charge`;

      byId('delivery-fee-price').textContent =
        money(deliveryFee);

      const pickupAddress =
        byId('pickup-address').value.trim();

      const pickupName =
        byId('pickup-name').value.trim();

      const deliveryAddress =
        byId('delivery-address').value.trim();

      const deliveryName =
        byId('delivery-name').value.trim();

      byId('estimate-details').innerHTML = `
        <div>
          <span>Pickup contact</span>
          <strong>${safeText(pickupName)}</strong>
          <small>
            ${safeText(pickupAddress)} · PIN ${safeText(pickupPin)}
          </small>
        </div>

        <div>
          <span>Delivery contact</span>
          <strong>${safeText(deliveryName)}</strong>
          <small>
            ${safeText(deliveryAddress)} · PIN ${safeText(deliveryPin)}
          </small>
        </div>

        <div>
          <span>Selected options</span>
          <strong>${safeText(loadType)} · ${safeText(deliveryType)}</strong>
          <small>
            ${loadType === 'LCL'
              ? '₹100 LCL fee included'
              : 'No LCL fee added'}
            ${deliveryType === 'Priority'
              ? ' · ₹700 priority fee included'
              : ' · No priority fee'}
          </small>
        </div>
      `;

      estimateBox.classList.remove('hidden');

      estimateBox.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    } catch (error) {
      showError(
        error.message ||
        'Could not calculate the estimate. Please try again.'
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = originalButtonText;
      }
    }
  }

  if (plannerForm) {
    plannerForm.addEventListener('submit', handleEstimate);
  }

  // Hide old estimates if the PIN codes are edited.
  ['pickup-pin', 'delivery-pin'].forEach(id => {
    const input = byId(id);

    if (!input) return;

    input.addEventListener('input', event => {
      event.target.value = cleanPin(event.target.value);

      const estimate = byId('price-estimate');

      if (estimate) estimate.classList.add('hidden');

      hideBookingPanel();
    });
  });

  // Recalculate if the load or delivery option changes.
  document
    .querySelectorAll(
      'input[name="loadType"], input[name="deliveryType"]'
    )
    .forEach(input => {
      input.addEventListener('change', () => {
        updateChoiceStyle(input);
        updateLoadFeeNote();

        const estimate = byId('price-estimate');

        if (estimate) estimate.classList.add('hidden');

        hideBookingPanel();
      });
    });

  // Hide stale estimates when the addresses or names change.
  [
    'pickup-address',
    'pickup-name',
    'delivery-address',
    'delivery-name'
  ].forEach(id => {
    const input = byId(id);

    if (!input) return;

    input.addEventListener('input', () => {
      const estimate = byId('price-estimate');

      if (estimate) estimate.classList.add('hidden');

      hideBookingPanel();
    });
  });

  const editButton = byId('edit-details');

  if (editButton) {
    editButton.addEventListener('click', () => {
      hideBookingPanel();

      const planner = byId('route-planner');

      if (planner) {
        planner.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  }

  // -------------------------------
  // BOOK THIS TRIP
  // -------------------------------
  const bookingDate = byId('booking-date');
  const bookingPanel = byId('booking-panel');
  const bookingTrigger = byId('book-trip-trigger');
  const bookingError = byId('booking-error');
  const bookingConfirmation = byId('booking-confirmation');
  const cancelBooking = byId('cancel-booking');

  // Prevent selection of a past pickup date.
  if (bookingDate) {
    bookingDate.min = localDateISO();
  }

  // Open the booking panel after the customer has received an estimate.
  if (bookingTrigger && bookingPanel) {
    bookingTrigger.addEventListener('click', () => {
      if (bookingDate) {
        bookingDate.min = localDateISO();
      }

      if (bookingError) {
        bookingError.textContent = '';
        bookingError.classList.add('hidden');
      }

      if (bookingConfirmation) {
        bookingConfirmation.textContent = '';
        bookingConfirmation.classList.add('hidden');
      }

      bookingPanel.classList.remove('hidden');

      bookingPanel.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      if (bookingDate) {
        bookingDate.focus({ preventScroll: true });
      }
    });
  }

  // Close the booking panel if the customer cancels.
  if (cancelBooking) {
    cancelBooking.addEventListener(
      'click',
      hideBookingPanel
    );
  }

  // Validate and display a booking-request summary.
  if (bookingForm) {
    bookingForm.addEventListener('submit', event => {
      event.preventDefault();

      if (bookingError) {
        bookingError.textContent = '';
        bookingError.classList.add('hidden');
      }

      if (bookingConfirmation) {
        bookingConfirmation.textContent = '';
        bookingConfirmation.classList.add('hidden');
      }

      const selectedDate = bookingDate
        ? bookingDate.value
        : '';

      const phoneField = byId('booking-phone');

      const phone = phoneField
        ? phoneField.value.trim()
        : '';

      const phoneDigits = phone.replace(/\D/g, '');

      let message = '';

      if (!selectedDate) {
        message = 'Please select your preferred pickup date.';
      } else if (selectedDate < localDateISO()) {
        message =
          'The pickup date cannot be in the past. Choose today or a future date.';
      } else if (
        !(
          phoneDigits.length === 10 ||
          (
            phoneDigits.length === 12 &&
            phoneDigits.startsWith('91')
          )
        )
      ) {
        message =
          'Enter a valid Indian mobile number with 10 digits, optionally including country code +91.';
      }

      if (message) {
        if (bookingError) {
          bookingError.textContent = message;
          bookingError.classList.remove('hidden');
        }

        return;
      }

      const formattedDate = new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'full'
      }).format(new Date(`${selectedDate}T12:00:00`));

      const routeText = byId('estimate-route')
        ? byId('estimate-route').textContent
        : 'Your selected route';

      const totalText = byId('estimated-total')
        ? byId('estimated-total').textContent
        : 'Unavailable';

      if (bookingConfirmation) {
        bookingConfirmation.innerHTML = `
          <div class="booking-confirmation-title">
            Booking request details are ready
          </div>

          <div>
            <strong>Route:</strong>
            ${safeText(routeText)}
          </div>

          <div>
            <strong>Preferred pickup date:</strong>
            ${safeText(formattedDate)}
          </div>

          <div>
            <strong>Estimated price:</strong>
            ${safeText(totalText)}
          </div>

          <div>
            <strong>Contact number:</strong>
            ${safeText(phone)}
          </div>

          <p>
            <strong>Important:</strong>
            This is a local demo confirmation only. Your request has
            not been sent to LoadMatch and no vehicle has been reserved.
            Connect this form to a booking backend or service to accept
            real booking requests.
          </p>
        `;

        bookingConfirmation.classList.remove('hidden');

        bookingConfirmation.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    });
  }

  // -------------------------------
  // ENQUIRY FORM
  // -------------------------------
  if (enquiryForm) {
    enquiryForm.addEventListener('submit', event => {
      event.preventDefault();

      const nameField = byId('enquiry-name');
      const emailField = byId('enquiry-email');
      const messageField = byId('enquiry-message');
      const status = byId('enquiry-status');

      if (!nameField || !emailField || !messageField || !status) {
        return;
      }

      const name = nameField.value.trim();
      const email = emailField.value.trim();
      const message = messageField.value.trim();

      if (!name || !email || !message) {
        status.textContent =
          'Please fill in your name, email address and message.';
        return;
      }

      status.textContent =
        `Thank you, ${name}. This demo form is not connected to an inbox, so your enquiry has not been sent or stored.`;
    });
  }

  // Update the footer year automatically.
  const year = byId('year');

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // Set demo PIN codes when the fields are empty.
  const pickupInput = byId('pickup-pin');
  const deliveryInput = byId('delivery-pin');

  if (pickupInput && !pickupInput.value) {
    pickupInput.value = '380001';
  }

  if (deliveryInput && !deliveryInput.value) {
    deliveryInput.value = '302001';
  }

  updateLoadFeeNote();
});