# County Profile Demo

This is a separate practice project. It does not connect to or change the RESL board.

The two CSV files in `data/` are the source information. The template in `templates/` controls the document layout. `scripts/generate_profiles.py` combines them to create one Markdown profile per county in `docs/profiles/` plus an index in `docs/`.

**All county names and numbers here are fictional demonstration data.** Replace them with verified information and source notes before using any profile for real decisions.

## Try it on your computer

1. Extract the ZIP to a permanent folder, such as `Documents/GitHub/County_Profile_Demo`.
2. In GitHub Desktop, select **File > Add local repository** and choose that folder. It is already initialized as a separate Git repository and has no connection to RESL.
3. Open `data/counties.csv` in a text editor or spreadsheet application. Change the population for one demo county and save it as CSV.
4. If Python 3 is installed, open a terminal in the project folder and run `python scripts/generate_profiles.py`. Open the matching file in `docs/profiles/` to see the new value.
5. In GitHub Desktop, review the changed CSV and generated Markdown files. Enter a commit message such as `Update demo county population`, then commit.
6. Select **Publish repository** in GitHub Desktop. Keep it private while experimenting if you prefer. The first publication sends the practice project to your GitHub account.

## See the automatic refresh

After publishing, edit either CSV file and commit and push it with GitHub Desktop. The workflow in `.github/workflows/refresh-profiles.yml` runs on GitHub, rebuilds the profile documents, and commits any changed documents back to the same repository. In GitHub, open the **Actions** tab to see the run. Then use **Fetch origin** and **Pull origin** in GitHub Desktop to bring the generated document changes back to your computer before your next edit.

The workflow needs permission to write repository contents. It requests that permission in its own configuration, though organization or repository rules can still restrict it. A protected `main` branch may also prevent an automatic commit; this demo assumes a new personal test repository without branch protection.

## What to change later

- Add or update county figures in `data/counties.csv`.
- Add or update service listings in `data/services.csv`.
- Change the wording or layout in `templates/profile.md`.
- Change validation or formatting rules in `scripts/generate_profiles.py`.

The output files in `docs/` are generated. To refresh them, change the inputs or template and run the generator, or push those changes to GitHub and let the workflow run.

The same pattern can later read verified Excel exports, ArcGIS exports, or other structured files. That would require mapping the real fields and agreeing on which sources and update dates belong in each profile.

## Official GitHub help

- [Add an existing local repository in GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop)
- [Publish an existing project with GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)
- [View a GitHub Actions run](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/monitoring-workflows/viewing-workflow-run-history)
