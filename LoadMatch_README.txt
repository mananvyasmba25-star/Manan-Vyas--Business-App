LOADMATCH WEBSITE — FINAL PROTOTYPE
==================================

OVERVIEW
--------
LoadMatch is a responsive front-end website prototype for planning road-freight shipments between PIN-code areas in Gujarat and Rajasthan. A visitor can enter pickup and delivery details, select a load type and delivery preference, view an indicative route and price estimate, and open a booking-request form to choose a preferred pickup date.

FILES INCLUDED
--------------
- index.html  : Website content and structure, including Home, About, sample Dashboard, Estimate, Booking Request, and Contact/Enquiry sections.
- styles.css  : Visual design, layout, and responsive styling for desktop and mobile screens.
- script.js   : PIN-code validation/lookups, route estimation, pricing calculation, booking-date form validation, confirmation preview, and enquiry-form demo response.
- README.txt  : Setup instructions, feature summary, pricing rules, and prototype limitations.

HOW TO RUN THE WEBSITE
----------------------
1. Extract the website files into one folder.
2. Keep index.html, styles.css, and script.js in the same folder. Do not rename the files unless you also update the references in index.html.
3. Recommended: open the folder in Visual Studio Code and run index.html with the Live Server extension.
4. Alternatively, if Python is installed, open a terminal in the website folder and run:
      python -m http.server 8000
   Then open http://localhost:8000 in your browser.
5. Internet access is needed for external PIN-code lookups, geocoding, road-route estimates, and Google Fonts. Some common demo PIN codes are included in the JavaScript for convenience.

MAIN WEBSITE FEATURES
---------------------
- Home and About sections describing the LoadMatch freight-planning concept.
- Sample operations dashboard with illustrative metrics.
- Pickup and delivery PIN codes, addresses, and contact-person names.
- Support for LCL (shared load) and FCL (full-truck load) options.
- Standard and Priority delivery choices.
- Route-distance and travel-time estimate, where available.
- Itemised indicative price estimate.
- “Book this trip” step with preferred pickup-date selection and contact mobile number.
- Contact/Enquiry form with a front-end demonstration response.
- Responsive styling for desktop and mobile screens.

PRICE ESTIMATE LOGIC
--------------------
The current demonstration calculation is:

  Base transport price = greater of (₹500) or (estimated distance in km × ₹20)
  LCL fee              = ₹100
  FCL fee              = ₹0
  Standard delivery    = ₹0 additional fee
  Priority delivery    = ₹700 additional fee

  Estimated total = Base transport price + applicable load fee + applicable delivery fee

These rates are illustrative prototype assumptions, not a live quote or guaranteed transporter price. The final amount may differ based on vehicle type, cargo, tolls, waiting time, route conditions, serviceability, and the transporter’s commercial terms.

ROUTE AND PIN-CODE ESTIMATES
----------------------------
- A small list of common Gujarat and Rajasthan PIN codes is built into script.js.
- Other PIN codes are looked up through a public PIN-code service and must resolve to Gujarat or Rajasthan.
- The script attempts to locate PIN-code areas and request a driving route from public geocoding/routing services.
- If a road route cannot be obtained but coordinates are available, the page uses an approximate fallback: straight-line distance multiplied by 1.25 and an assumed average speed of 40 km/h. This fallback is not a verified road distance or live travel-time forecast.
- Results may be unavailable, incomplete, delayed, or approximate if an external service is down or limits requests.

BOOKING AND ENQUIRY LIMITATIONS
-------------------------------
- The booking form checks that the pickup date is today or a future date and validates the mobile-number format.
- After submission, it displays a local confirmation preview of the route, preferred date, estimated price, and contact number.
- The booking request is NOT sent to a business, saved in a database, or linked to a real vehicle. No truck is reserved, and no payment is taken.
- The Contact/Enquiry form displays a demonstration message only. It does NOT send or store enquiries.
- Real bookings require a secure backend/database or booking service, server-side validation, a way for the operator to receive requests, and integration with actual vehicle/transport-partner availability. Production use should also consider privacy, security, consent, retention, and payment requirements where applicable.

DEMO DASHBOARD DATA
-------------------
The dashboard shows 200 vehicles available, 3,000 trips completed, 2,900 on-time deliveries, and 5.2 km/L average fleet fuel efficiency. These are illustrative demo values only; they are not live or verified LoadMatch operating data. The stated 96.7% is calculated from the sample figures 2,900 / 3,000.

PLACEHOLDER CONTACT DETAILS
---------------------------
The website currently displays hello@loadmatch.example, +91 XXXXX XXXXX, and Ahmedabad, Gujarat, India as proposed placeholder contact details. Replace them with verified business details before sharing or publishing the website.

BEFORE PUBLIC OR PRODUCTION DEPLOYMENT
--------------------------------------
- Replace all placeholder contact information.
- Connect booking and enquiry submissions to a secure backend or trusted service.
- Add real vehicle availability, dispatch workflows, and booking-reference generation.
- Review the public PIN-code, geocoding, routing, and font providers’ usage policies and reliability before relying on them for production traffic.
- Review the pricing formula and test it against actual transporter quotations and operating costs.
- Test PIN-code cases, mobile and desktop layouts, and booking validation.

TECHNOLOGY
----------
Plain HTML, CSS, and JavaScript. No build step or package installation is required. The prototype relies on internet access for third-party lookup/routing services and remote fonts.
