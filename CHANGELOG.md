# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased

### Added

### Changed

- ウェブフック通知にタイムアウトを設定

### Deprecated

### Removed

### Fixed

### Security

## v12.5.0 - 2019-12-06

### Changed

- 予約取引に仮予約が存在しない場合に、予約確定タスクが作成されないように調整
- 予約取引に仮予約が存在しない場合に、予約取消タスクが作成されないように調整

## v12.4.0 - 2019-11-19

### Added

- 予約検索条件を拡張

### Changed

- 予約のbookingTimeを仮予約時にセットするように調整

## v12.3.0 - 2019-10-31

### Added

- イベント変更時処理を追加

## v12.2.0 - 2019-10-29

### Added

- プロジェクトリポジトリを追加
- 予約取消取引に予約ステータス変更時イベントを追加
- プロジェクトの予約通知設定を取引に反映

## v12.1.1 - 2019-10-29

### Fixed

- fix trigger webhook bug

## v12.1.0 - 2019-10-25

### Added

- 予約取引に予約ステータス変更時イベントを追加

## v12.0.0 - 2019-09-20

### Added

- 予約パッケージインターフェースを追加

### Changed

- 予約取引の予約番号発行プロセスと仮予約プロセスを分離
- 予約インターフェースの汎用性拡張
- install [@motionpicture/coa-service@7.0.0](https://www.npmjs.com/package/@motionpicture/coa-service)
- [Redisクライアント](https://www.npmjs.com/package/redis)をpeerDependenciesへ変更
- 予約データに不要なイベント属性について最適化

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
