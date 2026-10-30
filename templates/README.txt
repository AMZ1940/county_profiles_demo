COUNTY PROFILE: ARCGIS CONNECTION + SAVE AS PDF

These files let the published practice page sign in to ArcGIS and read county
facts from the ArcGIS item whose ID is configured in arcgis-connect.js. The
online profile can then be printed or saved as a PDF from the browser.

FILES TO ADD OR REPLACE IN GITHUB

1. Create templates/profile.md and paste the included Markdown template. The
   workflow currently fails because this required file is missing.
2. Replace templates/cedar_dashboard.html with the included dashboard template.
3. Create docs/assets/arcgis-connect.js and paste the included JavaScript file.
4. In arcgis-connect.js, replace PASTE_ARCGIS_CLIENT_ID_HERE with the Client ID
   from the ArcGIS application's credentials. Do not paste the client secret
   or temporary token.
5. Keep the existing docs/assets/dashboard.js, docs/assets/dashboard.css,
   scripts/generate_profiles.py, and .github/workflows/refresh-profiles.yml.

ARCGIS APPLICATION SETTINGS

In the ArcGIS application's Redirect URLs, add the exact root URL of this
GitHub Pages site, including its repository path and trailing slash when
shown. For example: https://amz1940.github.io/county_profiles_demo/
The redirect address in the page code is derived from the page's current URL.
The app's portal is set to https://tnema.maps.arcgis.com and its data item ID
is 0441cfa9730046399811c27c309214ce. Change those settings in the first part
of arcgis-connect.js if your app or data item is different.

HOW TO PUBLISH AND USE IT

Commit the template and new JavaScript file. The existing GitHub Actions
workflow watches templates/ and docs/, regenerates docs/index.html, and
publishes the Pages site. Open Actions and confirm the Refresh county profiles
workflow succeeds. Visit the Pages site, sign in with your ArcGIS account,
then choose Print / Save as PDF and select Save as PDF in the browser dialog.

COUNTY AND FIELD MATCHING

The loader first tries to match an ArcGIS row to the profile county name. It
recognizes common field names for population, households, and median household
income. If your ArcGIS table uses other field names, edit the candidate lists
in updateProfile() in arcgis-connect.js. For a table with multiple counties,
the county name needs to match the profile county or you must narrow the item
to the intended county.

PRIVACY

The Client ID is a public application identifier; never put a client secret or
temporary access token in browser code. ArcGIS permissions control access to
the connected item. The GitHub repository and Pages site may still be public.
Any real information kept in the repository or embedded in generated HTML/PDF
can be seen by the public, even when the page also asks users to sign in.
