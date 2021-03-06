# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## v15.58.3 - 2021-07-20

### Changed

- 注文カスタマーインターフェースを顧客組織にも拡張

## v15.58.2 - 2021-07-19

### Changed

- 取引のIAgentをウェブアプリケーションにも拡張

## v15.58.1 - 2021-07-19

### Changed

- 所有権の所有者インターフェースをウェブアプリケーションにも拡張

## v15.58.0 - 2021-07-18

### Added

- 決済URL発行ファンクションを追加

### Changed

- IAMロール検索条件拡張
- 予約にissuedThroughを追加
- 予約のreservationForを最適化
- プロダクトのserviceTypeをサービスアウトプットに連携
- 予約のprogramMembershipUsed型をPermitに変更
- プロダクト検索条件拡張
- サービスアウトプット検索条件拡張
- 決済サービスのserviceOutputへの依存をserviceTypeへの依存に変更
- ペイメントカード登録時に作成される口座のtypeOfをAccountに固定
- ペイメントカード決済承認前に決済方法検証処理を追加
- 予約開始時にissuedByの指定があれば適用するように調整
- 注文カスタマーインターフェースをウェブアプリケーションにも拡張

## v15.57.0 - 2021-07-04

### Changed

- プロジェクトメンバー検索条件拡張

## v15.56.0 - 2021-07-03

### Changed

- 各リソースのプロジェクトID検索条件指定を最適化($exists: trueを削除)
- 予約の単価オファーを最適化
- オファーカタログ検索条件拡張

## v15.55.0 - 2021-06-25

### Changed

- プロダクト検索条件拡張

## v15.54.0 - 2021-06-24

### Changed

- GMOリクエストにタイムアウトを設定
- 全リソースのプロジェクトID検索条件を統一
- 予約取消のttts互換性維持対応を削除

## v15.53.0 - 2021-06-23

### Changed

- 顧客コレクションインデックス調整

## v15.52.1 - 2021-06-23

### Changed

- 顧客コードをidentifier->branchCodeと変更

## v15.52.0 - 2021-06-21

### Changed

- プロダクト検索条件拡張
- オファー検索条件拡張

## v15.51.0 - 2021-06-20

### Changed

- 資産取引番号からプロジェクトプレフィックスを除外

## v15.50.0 - 2021-06-15

### Changed

- 単価オファーの提供アイテムを最適化
- サービスアウトプット検索にprojectionを指定できるように調整

## v15.49.0 - 2021-06-13

### Changed

- サービスアウトプット検索条件拡張
- 予約取引開始時の適用メンバーシップ検証にアクセスコードと有効期間確認処理を追加

## v15.48.0 - 2021-06-12

### Changed

- 予約取引に使用メンバーシップを指定できるように調整
- 予約取引開始時に適用メンバーシップ区分検証処理を追加
- 予約取引開始パラメータを最適化
- オファー検索条件拡張

## v15.47.0 - 2021-06-04

### Added

- インボイスリポジトリを追加
- 決済方法リポジトリを追加
- 注文リポジトリを追加
- 経理レポートリポジトリを追加
- 旧売上レポートリポジトリを追加
- ウェブフックサービスを追加
- コードリポジトリを追加
- 所有権リポジトリを追加
- プロジェクトメンバーリポジトリを追加
- IAMロールリポジトリを追加
- 顧客リポジトリを追加
- IAMサービスを追加
- telemetryリポジトリを追加
- 取引リポジトリを追加
- cinerinoからリポジトリを移行
- credentialsをエクスポート
- utilサービスを追加
- errorHandlerをエクスポート
- 口座リポジトリを追加
- 口座アクションリポジトリを追加
- 口座取引リポジトリを追加
- Pecorino SDKをエクスポート
- 口座サービスを追加(@pecorino/domainから移行)
- 口座取引サービスを追加(@pecorino/domainから移行)

### Changed

- 予約ステータス変更の冪等性担保
- 予約取消取引開始パラメータからtransactionを削除
- イベントの座席検索に$projection指定を追加
- 予約取消取引開始前に予約ステータスが確定済かどうか確認するように調整
- セクションに座席が未登録の場合のイベント予約集計を調整
- 返金アクションにtotalPaymentDueをセット
- プロジェクトのイベント変更時設定を廃止
- cinerinoのMongoDBインデックスを移行
- 資産取引コレクションをrename
- cinerinoのアクション検索条件を継承
- 資産取引のネームスペースを変更
- 口座リポジトリ参照のPecorino依存を排除
- 口座アクションリポジトリ参照のPecorino依存を排除
- 通貨転送取引中止時に取引が存在しない場合に対応
- サービス登録開始前に特典付与先口座の存在を確認するように調整

### Fixed

- イベントの座席オファー検索におけるコーディングバグに対応

## v15.46.1 - 2021-03-21

### Changed

- USE_CHECK_PAY_ACTION_BEFORE_REFUND設定を削除

## v15.46.0 - 2021-03-18

### Added

- 決済サービスタイプにFaceToFaceを追加
- ペイメントサービスのプロバイダー認証情報にトークン認証コードを追加
- 決済後処理を追加
- 返金後処理を追加
- 予約にbrokerを追加
- グローバル設定に決済ステータス変更時設定を追加
- グローバル設定に予約使用時設定を追加
- 決済と返金後の通知アクションを追加

### Changed

- 返品手数料決済処理をGMO取引の取消→即時売上で実装するように調整
- 返金取引開始前に決済アクションの存在確認を追加
- 決済取引開始時に販売者の対応決済方法を検証するように調整
- 返金取引開始時に、必ず決済取引から決済サービスタイプを取得するように調整
- コンテンツ名称を多言語対応

### Fixed

- 取引番号発行時のエラーハンドリング調整

## v15.45.0 - 2021-02-18

### Changed

- クレジットカード決済サービスの全パラメータにサイト情報をオプションとして追加

## v15.44.0 - 2021-02-05

### Added

- 予約通知先のグローバル設定を追加

### Changed

- COAオファーインポート処理にbulkWriteを使用するように調整

## v15.43.0 - 2021-01-27

### Added

- CreateReservationReportタスクを追加
- SendEmailMessageタスクを追加
- プロジェクトサービスを追加

### Changed

- アクション検索条件拡張
- イベントに入場ゲート集計属性を追加
- ID指定されたイベントについてはEventScheduledでなくても予約集計するように調整
- 予約にreservedTicket.dateUsed属性を実験的に追加
- 予約検索に$projectionを指定できるように調整
- update packages
- update typescript

## v15.42.5 - 2020-12-13

### Changed

- イベントのオファー集計にオファーカテゴリー情報を追加

## v15.42.4 - 2020-12-10

### Changed

- ポイント特典入金前に既に入金済かどうかを確認するように調整

## v15.42.3 - 2020-12-09

### Changed

- ムビチケ返金失敗時のエラーメッセージに情報追加

## v15.42.2 - 2020-12-09

### Changed

- ムビチケ返金失敗時のエラーメッセージに情報追加

## v15.42.1 - 2020-12-09

### Changed

- ポイント特典インターフェースを拡張

## v15.42.0 - 2020-12-08

### Changed

- Pecorino取引に対して識別子を指定できるように調整
- ポイント特典インターフェースを拡張

## v15.41.0 - 2020-12-04

### Changed

- 外部決済サービス認証情報を販売者から決済サービスへ移行
- 販売者検索の条件からpaymentAcceptedを除外
- プロダクト検索時にprojectionを指定できるように調整

## v15.40.1 - 2020-11-24

### Changed

- 座席に名称を追加

## v15.40.0 - 2020-11-24

### Changed

- ルームに検索条件を定義
- ルームセクションに検索条件を定義
- 座席に名称を追加
- オファー検索条件拡張

## v15.39.0 - 2020-11-24

### Changed

- カテゴリーコード検索条件拡張
- 勘定科目コレクションにインデックス追加

## v15.38.0 - 2020-11-21

### Changed

- オファー検索条件拡張

## v15.37.0 - 2020-11-20

### Changed

- カテゴリーコード検索条件拡張
- イベントシリーズ検索条件拡張

## v15.36.0 - 2020-11-20

### Changed

- 作品検索条件拡張
- 座席検索条件拡張
- オファーカタログ検索条件拡張

## v15.35.2 - 2020-11-19

### Changed

- update @chevre/factory

## v15.35.1 - 2020-11-17

### Changed

- サービス登録時に、オファーのポイント特典のtypeOf設定を反映するように調整

## v15.35.0 - 2020-11-17

### Changed

- AccountプロダクトタイプをPaymentCardに統合

## v15.34.0 - 2020-11-15

### Changed

- AccountプロダクトとPaymentCardプロダクトの挙動を統一

## v15.33.0 - 2020-11-13

### Changed

- 決済取引をPaymentCardサービスに対応

## v15.32.0 - 2020-11-11

### Added

- USE_MOVIETICKET_AUTHORIZE設定を追加

## v15.31.0 - 2020-11-04

### Changed

- プロダクトインターフェースを決済サービスにも拡張
- 外部決済サービス認証情報をproductsコレクションから取得するように調整
- ペイメントカードの通貨をPecorinoに反映するように調整
- update @pecorino/api-nodejs-client

## v15.30.1 - 2020-10-29

### Changed

- 勘定科目コレクションのインデックス調整

## v15.30.0 - 2020-10-29

### Changed

- プロダクト検索条件拡張

## v15.29.1 - 2020-10-18

### Changed

- categoryCodesに適切なインデックスを追加

## v15.29.0 - 2020-10-14

### Changed

- 販売者コレクションのインデックスを最適化
- イベントオファーごとのキャパシティ算出時に適用サブ予約条件を考慮するように調整

## v15.28.1 - 2020-10-12

### Changed

- 販売者検索条件から不要なものを削除

## v15.28.0 - 2020-10-10

### Changed

- 販売者検索条件拡張

## v15.27.0 - 2020-10-09

### Changed

- 施設検索条件拡張

## v15.26.1 - 2020-10-02

### Changed

- COAのflgMvtkUseをMGチケットにも適用するように調整

## v15.26.0 - 2020-09-30

### Added

- 決済取引をPaymentServiceType:Accountに対応
- 返金取引をPaymentServiceType:Accountに対応

### Changed

- update @motionpicture/gmo-service
- 決済取引開始時に決済方法説明を指定できるように調整
- 返金取引開始時に、決済サービス未指定であれば決済取引を自動検索するように調整

## v15.25.0 - 2020-09-24

### Changed

- update @motionpicture/coa-service
- update @pecorino/api-nodejs-client

## v15.24.1 - 2020-09-23

### Removed

- 通貨転送取引において決済方法タイプ:PointをAccountへ自動変換する互換性維持対応を削除

## v15.24.0 - 2020-09-22

### Changed

- イベントの予約集計処理において、オファーカタログが見つからない場合に対応

## v15.23.0 - 2020-09-22

### Changed

- イベント予約集計時に、同location、かつ同時間帯、のイベントに関しても集計するように調整

## v15.22.0 - 2020-09-18

### Changed

- 転送取引開始時にプロダクトタイプによって処理を調整するように対応
- MoneyTransfer取引のオブジェクトを定義
- 販売者スキーマから不要な属性を削除

## v15.21.0 - 2020-09-11

### Added

- 決済取引に決済方法認証処理を追加

### Changed

- プロダクトタイプ管理を@chevre/factoryへ移行

## v15.20.0 - 2020-09-08

### Changed

- イベントのacceptedPaymentMethodをunacceptedPaymentMethodとして再管理
- オファーの適用ムビチケ条件の決済方法として、appliesToMovieTicket.serviceOutput.typeOfを参照するように変更

## v15.19.0 - 2020-09-04

### Added

- 決済取引をCreditCardとMovieTicketに対応
- 劇場インターフェースにhasEntranceGateを追加
- 返金取引を追加
- USE_AGGREGATE_ON_PROJECT設定を追加
- 中止を報告しないタスク設定を追加
- アクションリポジトリに検索処理を追加

### Changed

- 取引タイプごとのタスクエクスポート処理を共通化
- 余分確保分座席が残席数に反映されるように集計処理を調整
- 予約作成時にイベントに対する予約集計処理を追加
- ttts対応として同時間帯のイベントについても同時に予約集計するように調整
- 販売者インターフェースを最適化

## v15.18.0 - 2020-07-13

### Added

- 決済取引を追加
- 販売者リポジトリを追加

## v15.17.1 - 2020-07-12

### Changed

- イベントオファー検索処理を最適化

## v15.17.0 - 2020-07-08

### Changed

- オファーと価格仕様のappliesToMovieTicketTypeをappliesToMovieTicketに変更

## v15.16.0 - 2020-07-02

### Added

- 最大予約猶予期間設定を追加

## v15.15.1 - 2020-07-01

### Fixed

- イベント保管メソッドがパラメータ変数を上書きしてしまうバグ対応

## v15.15.0 - 2020-06-30

### Changed

- プロダクト検索条件拡張

## v15.14.0 - 2020-06-28

### Removed

- メンバーシップ登録取引を削除

## v15.13.0 - 2020-06-27

### Changed

- サービス登録取引を取引番号で中止できるように調整

## v15.12.0 - 2020-06-25

### Changed

- サービスアウトプット検索条件拡張

## v15.11.0 - 2020-06-24

### Added

- プロダクトタイプにAccountを追加

## v15.10.0 - 2020-06-24

### Changed

- サービス登録時のサービスアウトプット識別子の指定を、プロダクトタイプに関わらず必須に変更

## v15.9.0 - 2020-06-24

### Added

- サービスアウトプット識別子リポジトリを追加

## v15.8.0 - 2020-06-16

### Added

- サービス登録時にオファーのポイント特典を適用するように調整

### Changed

- update packages

## v15.7.0 - 2020-06-11

### Changed

- サービス登録取引を取引番号で確定できるように調整

## v15.6.0 - 2020-06-10

### Changed

- サービス登録取引をメンバーシップサービスに対応

## v15.5.0 - 2020-05-29

### Added

- 予約番号での予約取消を追加

## v15.4.0 - 2020-05-26

### Changed

- COAイベントインポート処理をbulkWriteへ変更

## v15.3.0 - 2020-05-26

### Added

- 1トランザクションでの予約取消取引処理を追加

## v15.2.1 - 2020-05-26

### Changed

- COAイベントキャパシティインポート処理をbulkWriteへ変更

## v15.2.0 - 2020-05-26

### Changed

- COAイベントキャパシティインポート処理をbulkWriteへ変更

## v15.1.1 - 2020-05-25

### Fixed

- 予約取消時のサブ予約取消処理を調整

## v15.1.0 - 2020-05-24

### Added

- 劇場に親組織を追加

## v15.0.1 - 2020-05-22

### Changed

- イベントのカタログ検索条件を調整

## v15.0.0 - 2020-05-22

### Added

- サービス登録取引を追加
- 通貨転送取引を追加
- 通貨転送取引番号リポジトリを追加
- DepositServiceを追加
- イベントにhasOfferCatalogを追加

### Changed

- イベントのカタログ情報をoffersからhasOfferCatalogへ分離
- 取引ステータス変更時の複数タスク作成を一度に実行するように変更
- COA情報インポートタスクのエラーハンドリング調整
- 予約取引に取引番号を指定できるように調整
- 予約番号を取引番号として拡張
- 予約取引を取引番号で確定できるように調整
- 予約取引開始時に座席オファーを指定できるように調整

## v14.7.0 - 2020-04-26

### Changed

- COAオファーインポート処理を調整

## v14.6.0 - 2020-04-24

### Added

- COAイベントキャパシティインポートタスクを追加
- プロジェクトにイベントインポート期間設定を追加

### Changed

- COAイベントインポート処理を調整
- タスク中止時の通知メッセージを調整

## v14.5.0 - 2020-04-15

### Added

- 予約にpreviousReservationStatusを追加

### Changed

- 発券カウントと入場カウント時に予約ステータスを条件に含めないように変更

## v14.4.0 - 2020-04-14

### Added

- プロジェクトごとの集計タスクを追加

### Fixed

- 座席のないイベントに対する座席を検索できないバグ対応

## v14.3.0 - 2020-04-13

### Added

- 劇場にPOS属性を追加

### Changed

- DeprecationWarning: collection.update is deprecated. -> updateMany
- mongoose.Schemaの汎用性を全体的に強化

## v14.2.0 - 2020-04-10

### Added

- イベントの座席オファーのページング検索機能を追加

### Changed

- 座席有イベントかどうかの判断を最適化

## v14.1.0 - 2020-04-07

### Added

- イベント固有のキャパシティ設定による在庫管理を実装

### Changed

- 場所コレクションインデックス調整
- Mongoose: the `safe` option -> writeConcerns

## v14.0.0 - 2020-03-30

### Changed

- 券種検索条件をオファー検索条件に統合
- ticketTypesコレクションをoffersコレクションへ移行
- 予約コレクションのデフォルトソート条件を予約日時に変更
- 予約検索条件拡張

### Removed

- 旧細目リポジトリを削除

## v13.0.0 - 2020-03-04

### Added

- プロダクトリポジトリを追加
- オファーコレクションを追加
- オファーカタログコレクションを追加
- メンバーシップリポジトリを追加
- 予約レポートサービスを追加
- メンバーシップ登録取引サービスを追加
- カテゴリーコードリポジトリを追加
- カテゴリーコードチャージ仕様インターフェースを追加
- オファーカテゴリータイプを追加
- オファーレート制限リポジトリを追加
- オファーカタログリポジトリを追加

### Changed

- オファーリポジトリの券種関連メソッドの名前を変更
- 各リソースの正規表現検索についてcase insensitivityを無効化
- 作品検索条件拡張
- 券種検索条件拡張
- 券種グループ検索条件拡張
- 勘定科目検索条件拡張
- サービスタイプをカテゴリーコードに統合
- 配給区分をカテゴリーコードに統合
- 座席に対するオファーインターフェースを拡張
- 予約の価格仕様インターフェースを拡張
- 予約にアドオンを指定できるように調整
- オファー適用条件拡張
- イベントのacceptedOfferを拡張
- 座席タイプの適格性に対するバリデーションを追加
- イベント残席数集計を座席ロック数から計算するように調整
- 予約に余分確保分としてのsubReservationを追加
- オファーに適用サブ予約条件を追加
- 自由席許可属性を場所インターフェースに追加
- オファーに有効期間を追加
- イベントのオファー検索結果をカタログの登録順にソート
- 作品コレクションのインデックス調整
- ticketTypeGroupsをofferCatalogsへ移行
- 券種インターフェースを単価オファーインターフェースとして再定義

## v12.6.0 - 2019-12-25

### Changed

- ウェブフック通知にタイムアウトを設定

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
