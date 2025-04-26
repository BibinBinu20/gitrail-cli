        ██████╗  ██╗████████╗ ██████╗  █████╗ ██╗██╗     
        ██╔════╝ ██║╚══██╔══╝ ██╔══██╗██╔══██╗██║██║     
        ██║  ███╗██║   ██║    ██████╔╝███████║██║██║     
        ██║   ██║██║   ██║    ██╔══██╗██╔══██║██║██║     
        ╚██████╔╝██║   ██║    ██║  ██║██║  ██║██║███████╗
         ╚═════╝ ╚═╝   ╚═╝    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝   

# 📦 GitRail-cli

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
CLAUDE_MODEL=us.anthropic.xx-model
TESTRAIL_DOMAIN=https://domain.testrail.com
TESTRAIL_USER=user@coupa.com
TESTRAIL_KEY=api_key
GITHUB_TOKEN=ghp_xx
```

7.  Optionally, link the CLI globally for easier use:

```
npm link
```

### For Usage (Production):

1.  Download the packaged release version from the **Releases** section.
2.  Move the package to /usr/local/bin and rename it to gitrail-cli
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
