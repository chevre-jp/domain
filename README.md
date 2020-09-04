# Chevre Domain Library for Node.js

[![npm (scoped)](https://img.shields.io/npm/v/@chevre/domain.svg)](https://www.npmjs.com/package/@chevre/domain)
[![CircleCI](https://circleci.com/gh/chevre-jp/domain.svg?style=svg)](https://circleci.com/gh/chevre-jp/domain)
[![Coverage Status](https://coveralls.io/repos/github/chevre-jp/domain/badge.svg?branch=master)](https://coveralls.io/github/chevre-jp/domain?branch=master)
[![Dependency Status](https://img.shields.io/david/chevre-jp/domain.svg)](https://david-dm.org/chevre-jp/domain)
[![Known Vulnerabilities](https://snyk.io/test/github/chevre-jp/domain/badge.svg?targetFile=package.json)](https://snyk.io/test/github/chevre-jp/domain?targetFile=package.json)
[![npm](https://img.shields.io/npm/dm/@chevre/domain.svg)](https://nodei.co/npm/@chevre/domain/)

予約管理サービスドメイン

## Table of contents

* [Usage](#usage)
* [Code Samples](#code-samples)
* [License](#license)

## Usage

```shell
npm install --save @chevre/domain
```

```Node.js
const chevre = require("@chevre/domain");
```

### Environment variables

| Name                           | Required | Value           | Purpose                           |
| ------------------------------ | -------- | --------------- | --------------------------------- |
| `ABORTED_TASKS_WITHOUT_REPORT` | false    |                 | Aborted task names without report |
| `DEBUG`                        | false    | chevre-domain:* | Debug                             |
| `COA_ENDPOINT`                 | false    |                 | COA API Settings                  |
| `COA_REFRESH_TOKEN`            | false    |                 | COA API Settings                  |
| `LINE_NOTIFY_URL`              | false    |                 | LINE Notify Settings              |
| `LINE_NOTIFY_ACCESS_TOKEN`     | false    |                 | LINE Notify Settings              |

## Code Samples

Code sample are [here](https://github.com/chevre-jp/domain/tree/master/example).

## License

ISC
