# Chevre Domain Library for Node.js

[![npm (scoped)](https://img.shields.io/npm/v/@chevre/domain.svg)](https://www.npmjs.com/package/@chevre/domain)
[![CircleCI](https://circleci.com/gh/chevre-jp/domain.svg?style=svg)](https://circleci.com/gh/chevre-jp/domain)
[![Coverage Status](https://coveralls.io/repos/github/chevre-jp/domain/badge.svg?branch=master)](https://coveralls.io/github/chevre-jp/domain?branch=master)
[![Dependency Status](https://img.shields.io/david/chevre-jp/domain.svg)](https://david-dm.org/chevre-jp/domain)
[![Known Vulnerabilities](https://snyk.io/test/github/chevre-jp/domain/badge.svg?targetFile=package.json)](https://snyk.io/test/github/chevre-jp/domain?targetFile=package.json)
[![npm](https://img.shields.io/npm/dm/@chevre/domain.svg)](https://nodei.co/npm/@chevre/domain/)

元祖興行パッケージオンラインチケットシステムのドメインモデルをnode.jsで使いやすいようにまとめたパッケージです。

## Table of contents

* [Usage](#usage)
* [Code Samples](#code-samples)
* [License](#license)

## Usage

```shell
npm install --save @chevre/domain
```

```Javascript
const chevre = require("@chevre/chevredomain");
```

前提として、mongooseでdefault connectionを確保することと、redis情報をセットすることが必要。

* mongoose default connection

```Javascript
chevre.mongoose.connect();
```

### Environment variables

| Name                                     | Required | Value           | Purpose                     |
|------------------------------------------|----------|-----------------|-----------------------------|
| `DEBUG`                                  | false    | chevre-domain:* | Debug                       |
| `CHEVRE_PERFORMANCE_STATUSES_REDIS_PORT` | true     |                 | パフォーマンス空席状況保管RedisCache接続情報 |
| `CHEVRE_PERFORMANCE_STATUSES_REDIS_HOST` | true     |                 | パフォーマンス空席状況保管RedisCache接続情報 |
| `CHEVRE_PERFORMANCE_STATUSES_REDIS_KEY`  | true     |                 | パフォーマンス空席状況保管RedisCache接続情報 |

## Code Samples

Code sample are [here](https://github.com/chevre-jp/domain/tree/master/example).

## License

ISC
