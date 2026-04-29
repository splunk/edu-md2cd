# Splunk Cloud 管理

## 概要

このコースは、Splunk Cloudの管理初心者や、Splunk Cloudインスタンスの管理経験を高めたい方のためのものです。

このコースでは、管理者がSplunk Cloud環境に必要なデータ管理やシステム構成、データ収集および取り込みに関するスキル、知識、ベストプラクティスを習得し、生産的なSplunk SaaS導入を実現する機会が提供されます。ハンズオンラボでは、プラットフォームやユーザーの管理・維持、Splunk Cloudへのデータ取り込み方法について学び、質問できる機会があります。モジュールにはデータ入力とフォワーダー設定、データ管理、ユーザーアカウント、基本的な監視と問題の切り分けが含まれます。

注意: Splunk Cloud AdministrationとTransitioning to Splunk Cloudは、両方ともSplunk Cloud固有のスキル習得を目的として設計されているため、一部内容が重複しています。両コースを同時に受講しないでください。

## 受講前提条件
成功するために、受講者は以下のSplunk Educationコースを修了しているか、同等の実務知識を持っている必要があります:
- Splunkとは？
- Splunk入門
- フィールドの使用
- ナレッジオブジェクト入門
- ナレッジオブジェクトの作成
- フィールド抽出の作成

さらに、以下の分野に関するコースや知識も強く推奨されます:
- Linuxなどの一般的なオペレーティングシステムの基礎理解
- ルックアップによるデータの拡張
- データモデル

<!-- ⚠️ PREREQUISITES RENDER HERE. DO NOT MOVE OR REMOVE THIS COMMENT ⚠️ -->

## コース概要

### モジュール1 - Splunk Cloud概要
- SplunkおよびSplunk Cloudの機能とトポロジーを説明する
- Splunk Cloud管理者のタスクを特定する
- Splunk Cloudの購入オプションおよびClassicとVictoria体験の違いを説明する
- Splunk導入のセキュリティベストプラクティス
- Splunk Cloudのデータ取り込み戦略を説明する

### モジュール2 - ユーザー管理
- Splunk Cloudの認証オプションを特定する
- ネイティブ認証を使用してSplunkユーザーを追加する
- カスタムロールを作成する
- SplunkをLDAP、Active Directory、またはSAMLと統合する
- Workload Managementでユーザーリソース使用量を管理する
- Splunkでユーザーを管理する

### モジュール3 - インデックス管理
- クラウドインデックス戦略を理解する
- インデックスを定義し作成する
- データ保持およびアーカイブを管理する
- インデックスからデータを削除・マスクする
- インデックス活動を監視する

### モジュール4 - 設定ファイルの利用
- Splunk設定ディレクトリ構造を説明する
- インデックス時・検索時の優先順位による設定の重ね合わせプロセスを説明する
- btoolなどSplunkツールを使って設定内容を調査する

### モジュール5 - アプリ管理
- アプリのインストール手順を確認する
- プライベートアプリの目的を定義する
- プライベートアプリをアップロードする
- アプリの管理方法を説明する

### モジュール6 - フォワーダーの設定
- Splunkフォワーダーの種類を一覧する
- フォワーダーの役割を理解する
- フォワーダーを設定してSplunk Cloudへデータを送信する
- フォワーダー接続をテストする
- フォワーダーのオプション設定を説明する

### モジュール7 - フォワーダー管理
- Splunk Deployment Server (DS)を説明する
- デプロイメントアプリでフォワーダーを管理する
- デプロイメントクライアントおよびクライアントグループを設定する
- フォワーダー管理活動を監視する

### モジュール8 - フォワーダー入力
- Splunkによるデータ入力プロセスの説明
- ファイルやディレクトリ監視入力を作成する
- 監視入力のオプション設定を使用する
- ネットワーク入力を作成する

### モジュール9 - 共通入力
- REST API入力を作成する
- 基本的なスクリプト入力を作成する
- Linux特有の入力を特定する
- Windows特有の入力を特定する
- Splunk HTTP Event Collector (HEC)エージェントレス入力を作成する

### モジュール10 - 追加入力
- アプリやアドオンで入力を管理する方法を理解する
- Splunk Connect for Syslog、Data Manager、Inputs Data Manager (IDM)、Splunk Edge Processor、Splunk Edge Hubなどを用いたCloud入力を探る

### モジュール11 - 入力の微調整
- 入力フェーズ中に発生するデフォルト処理を説明する
- ソースタイプの微調整や文字セットエンコーディングなど入力フェーズのオプション設定
- btprobeコマンドでフォワーダーのファイルチェックポインタをリセットする

### モジュール12 - パースフェーズとデータプレビュー
- パースフェーズ中に発生するデフォルト処理を説明する
- イベントの改行処理の最適化・設定
- タイムスタンプやタイムゾーンの抽出・割り当て方法の変更
- パースフェーズ中のイベント作成をData Previewで検証する

### モジュール13 - 入力データの操作
- Splunkの変換方法を探る
- SEDCMDやTRANSFORMSでデータをマスク・フィルタ・ルーティングする
- イベント値に基づきsourcetypeまたはhostを上書きする
- Ingest Actionsでルールセットを作成・管理する
- Ingest Actionルールでデータをマスク・フィルタ・ルーティングする

### モジュール14 - Splunk Cloudの管理
- AWSを用いたSplunk Cloud Private Connectivityで安全にデータを取り込む
- Federated Search機能の説明
- Splunk Secure GatewayなどSplunk接続体験アプリの説明
- Splunk App for Chargebackで事業部やユーザーごとのリソース利用状況の監視・管理
- Admin Config ServiceによるSplunk Cloudのセルフサービス管理作業

### モジュール15 - Splunk Cloudサポート
- Splunk Cloud Supportへ連絡する前の問題切り分け方法を知る
- Isolation Troubleshootingを使用する
- Splunk Supportへの連絡プロセスの定義

### 付録
- Splunkセキュリティの基礎を探る

## Splunk Educationについて

Splunk Educationでは、自己学習型eラーニングやインストラクター主導のトレーニング、ハンズオンラボを通じて、Splunkの最適化方法を学ぶことができます。学習パスや認定資格を探し、目標達成を目指しましょう。Splunkの各製品領域や、Splunk Platform Search Expert、Splunk EnterpriseまたはCloud管理者、SOCアナリストまたは管理者、DevOpsやSite Reliability Engineerなど、特定の役割に対応したコースも提供しています。柔軟な学習オプションや全コースカタログ、Splunk認定資格について詳しくは[http://www.splunk.com/education](http://www.splunk.com/education)をご覧ください。

お問い合わせは[education@splunk.com](mailto:education@splunk.com)までご連絡ください。