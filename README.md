# Cedar Demo County resilience profile

This is a separate practice project. It does not connect to or change the RESL board. The expanded browser product is `docs/index.html`; double-click it to see the current page on your computer.

`data/counties.csv` supplies Cedar's general figures. `data/cedar_profile.json` supplies its fictional state comparison, support-needs indicators, heat-map zones, disaster history, awards, grants, and hazard scores. `scripts/generate_profiles.py` combines them into the browser page and plain Markdown profiles.

**All county names, state figures, disasters, awards, grants, map zones, and risk scores are fictional demonstration data.** The reference image is an example of the indicator layout, not a data source. The heat map is a diagram, not real geography. The risk scores are illustrative planning priorities, not event probabilities.

## Try it on your computer

1. Open `docs/index.html` to see the expanded Cedar profile in your browser. It uses the fictional data already in this repository.
2. Your prior commit changed Cedar's population in `data/counties.csv` to **12,700**. I ran the generator so the browser page and Markdown profile now show that number.
3. For later edits, change a source file and run `python scripts/generate_profiles.py` (or `py scripts/generate_profiles.py` on some Windows installations). Refresh the browser tab to see the result.
4. In GitHub Desktop, review the source and generated files, commit them, and push when ready.

The browser page includes general stats, county versus made-up state charts, a schematic heat map, a disaster timeline, PA/IA award graphics, grants, and an illustrative future hazard index. If Python is not installed locally, the GitHub workflow can run it after you publish and push the repository.

## See the automatic refresh

With GitHub Free, a GitHub Pages site needs a **public** repository. Before publishing, review the practice data; public repositories are visible to everyone. In GitHub Desktop, click **Publish repository** and choose public visibility if you want the browser page online. In your repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**. If the first workflow run happened before Pages was enabled, open **Actions → Refresh county profiles → Run workflow** to run it again. When the run finishes, the Pages settings show the live website link.

For later edits, change an input file, commit and **Push origin** in GitHub Desktop. The workflow in `.github/workflows/refresh-profiles.yml` regenerates the profile and publishes the website. Refresh the live page in your browser to see the change. Use **Fetch origin** and **Pull origin** in GitHub Desktop to bring any generated file changes back to your computer.

The workflow needs permission to write repository contents. It requests that permission in its own configuration, though organization or repository rules can still restrict it. A protected `main` branch may also prevent an automatic commit; this demo assumes a new personal test repository without branch protection.

## What to change later

- Add or update county figures in `data/counties.csv`.
- Add or update service listings in `data/services.csv`.
- Edit Cedar's state comparisons, indicators, zones, events, PA categories, grants, and hazard scores in `data/cedar_profile.json`.
- Edit the browser page in `templates/cedar_dashboard.html`, `docs/assets/dashboard.css`, and `docs/assets/dashboard.js`.
- Change the wording or layout in `templates/profile.md`.
- Change validation or formatting rules in `scripts/generate_profiles.py`.

The Markdown profiles and `docs/index.html` are generated. To refresh them, change the inputs or template and run the generator, or push those changes to GitHub and let the workflow run. The generator checks that PA dollars by event equal PA dollars by category and that indicator percentages and hazard scores are within 0–100.

The same pattern can later read verified Excel exports, ArcGIS exports, or other structured files. That would require mapping the real fields and agreeing on which sources and update dates belong in each profile.

## Official GitHub help

- [Add an existing local repository in GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-a-repository-from-your-local-computer-to-github-desktop)
- [Publish an existing project with GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)
- [View a GitHub Actions run](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/monitoring-workflows/viewing-workflow-run-history)
- [Configure GitHub Pages with Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
