# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased

### Added

- 予約パッケージインターフェースを追加

### Changed

- 予約取引の予約番号発行プロセスと仮予約プロセスを分離
- 予約インターフェースの汎用性拡張
- install [@motionpicture/coa-service@7.0.0](https://www.npmjs.com/package/@motionpicture/coa-service)
- [Redisクライアント](https://www.npmjs.com/package/redis)をpeerDependenciesへ変更

### Deprecated

### Removed

### Fixed

### Security

## v11.0.1 - 2019-09-03

### Fixed

- 予約が存在しない場合に保留中予約取消タスクが失敗しないように調整

## v11.0.0 - 2019-09-03

### Added

- 通知サービスを追加

### Changed

- 予約確定アクションのポストアクションに予約通知アクションを追加
- 予約取消アクションのポストアクションに予約通知アクションを追加
- アクションスキーマ柔軟性拡張
- タスクサービスのエラーハンドリング拡張

## v10.0.0 - 2019-07-29

- パッケージ名を変更
- 予約管理サービスとして再構築
