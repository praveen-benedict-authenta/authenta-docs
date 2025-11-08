# Authenta On-Prem — Quick Run Instructions

## Prerequisites

- Run `aws configure` and save your AWS credentials locally (`~/.aws/credentials`).
- Install Node.js (LTS) via nvm (recommended).
- **Note:** ECR pull is a one-time operation to fetch repositories. After pulling images/repos, run:
    ```sh
    sh setup.sh
    ```
    Then follow setup instructions in **Authenta On Prem.docx** (including verifying the Node demo with `node index.js`).
- **Alternative:** Instead of `sh setup.sh`, perform manual steps in **Authenta On Prem.docx** → Section 8, Step 1.

---

## Access the Demo Folder

1. Change to the demo folder:
     ```sh
     cd demo-node
     ```

---

## Install Node.js (Recommended: LTS via nvm)

1. Install nvm and load it:
     ```sh
     curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
     source ~/.nvm/nvm.sh
     ```
2. Install and use Node LTS:
     ```sh
     nvm install --lts
     nvm use --lts
     ```

---

## Verify Node/npm

```sh
node -v
npm -v
```

---

## Install Project Dependencies and Run Demo

1. Change to demo folder (if not already there):
     ```sh
     cd demo-node
     ```
2. Install dependencies:
     ```sh
     npm install
     ```
3. Run the demo:
     ```sh
     node index.js
     ```

---

## Troubleshooting (Linux)

- **AWS credential errors:** Re-run `aws configure` and confirm profile/region.
- **Dependency issues:** Remove `node_modules` and reinstall:
    ```sh
    rm -rf node_modules package-lock.json
    npm install
    ```

---

You can witness the demo running in the terminal — after installing Node and changing into `demo-node`, run:

```sh
node index.js
```