COUNTY PROFILE: ARCGIS CONNECTOR UPDATE

For the sign-in repair, replace only docs/assets/arcgis-connect.js with the
included file. The connector follows the RESL OAuth pattern: direct visits
process the ArcGIS callback after redirect, while embedded views use a popup
and a validated message to return the authorization code. The dashboard, charts,
heat map, PDF link, and renderer stay as they are.

CLIENT ID

The replacement file is already prepared with the Client ID from your existing
practice connector. Never add an ArcGIS client secret or temporary token to
browser code.

ARCGIS APPLICATION SETTINGS

The ArcGIS app's Redirect URLs must include this exact GitHub Pages root URL:
https://amz1940.github.io/county_profiles_demo/
The page derives the redirect address from its current URL. The data portal and
item ID are set near the top of arcgis-connect.js.

PUBLISH AND TEST

In GitHub, open docs/assets/arcgis-connect.js, replace its contents with the
included file, and commit the change. Wait for the existing Pages workflow to
finish. Open the site in a new tab, click Sign in with ArcGIS, and approve the
request. If using Experience Builder, allow popups for the page if prompted.

The current practice profile's demographics, hazard illustrations, grants,
disaster history, and heat map remain mock data unless separately changed.
ArcGIS permissions protect the connected item, but a public repository or
public Pages site can expose any data stored in its files or generated pages.