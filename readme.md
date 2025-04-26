# 📦 gitrail-cli

> 🚀 A CLI tool to sync GitHub PR test cases into TestRail automatically.

- - -

## ✨ Features

*   Extract RSpec test cases from GitHub Pull Requests (PRs).
*   Automatically create and update test cases in TestRail.
*   Auto-create sections if not found.
*   Safe handling of AI JSON responses.

- - -

## ⚙️ Setup

### For Development:

1.  Clone the repository:

```
git clone <your-repo-url>
cd gitrail-cli
npm install
```

3.  Create a `.env` file (you can copy from `.sample.env`) and fill in your keys:

```
cp .sample.env .env
```

5.  Or add environment variables directly to your `~/.zshrc` or `~/.bashrc`:

```
export AWS_REGION=your-region
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export TESTRAIL_USERNAME=your-username
export TESTRAIL_APIKEY=your-api-key
export TESTRAIL_URL=https://yourcompany.testrail.io/
export GITHUB_TOKEN=your-github-token
```

7.  Optionally, link the CLI globally for easier use:

```
npm link
```

### For Usage (Production):

1.  Download the packaged release version from the **Releases** section.
2.  Place your environment variables from `.sample.env` into your `~/.zshrc` or `~/.bashrc`.
3.  Reload your shell session:

```
source ~/.zshrc
```

- - -

## 🛠️ Commands

### Sync Test Cases to TestRail

```
gitrail-cli sync [repoBranch] -p <projectId> -s <suiteId> -r <rootSectionId> --pr <pullRequestId> [-t <jiraTicketId>]
```

### Extract Cases as JSON Only

```
gitrail-cli cases [repoBranch] -g <pullRequestId>
```

- - -

## 🚨 Notes

*   Retries parsing once automatically if JSON format is broken.
*   Fails gracefully with "Failed to Process case, Please Try Again" if JSON cannot be extracted.

- - -

## 📜 License

MIT License.