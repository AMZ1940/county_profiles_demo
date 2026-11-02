ARCGIS SIGN-IN ONLY CONNECTOR

This connector uses ArcGIS OAuth 2.0 with PKCE for the sign-in step. The county
profile data stays in the website's existing PROFILE_DATA. The connector does
not download data from ArcGIS and does not need a county data item ID.

WHAT TO UPDATE IN GITHUB

Replace only docs/assets/arcgis-connect.js with the included file and commit it.
The CLIENT_ID line is populated from your ArcGIS OAuth application's public
Client ID. Do not add a client secret or temporary token. Keep the existing
profile template, generated data, charts, heat map, PDF, and workflow files.

The redirect URL registered in your ArcGIS OAuth application must include:
https://amz1940.github.io/county_profiles_demo/

After committing, wait for the GitHub Pages workflow to finish and open the
clean site URL. Sign in with ArcGIS; when embedded in Experience Builder, allow
the sign-in popup. On success, the page will show the profile data already
included in the website.

PRIVACY LIMIT

This is a sign-in demonstration. GitHub Pages serves static files publicly, so
an ArcGIS sign-in screen in browser code does not protect the underlying page
or data from someone who knows how to open the files directly. Do not put real
private county information in a public repository or GitHub Pages site. Real
private access needs hosting or a backend that enforces ArcGIS identity before
serving the data.