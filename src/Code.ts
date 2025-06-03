/**
 * Google Apps Script エントリーポイント
 * X(Twitter) OAuth 2.0認証とポスト機能
 */

// 設定値
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || '';

/**
 * OAuth 2.0認証を開始する関数（GET リクエスト用）
 */
function startOAuthAuthentication(): string {
  try {
    const authUrl = XOAuth.getAuthorizationUrl();
    return authUrl;
  } catch (error) {
    Logger.log(`OAuth認証開始エラー: ${error}`);
    throw error;
  }
}

/**
 * OAuth 2.0認証を完了する関数
 */
function completeOAuthAuthentication(authCode: string, state: string): void {
  try {
    const result = XOAuth.getAccessToken(authCode, state);
    
    // 認証情報をスプレッドシートに保存
    SpreadsheetManager.saveAuthInfo(
      SPREADSHEET_ID,
      result.userId,
      result.username,
      result.accessToken,
      result.refreshToken
    );
    
    Logger.log(`認証完了: ${result.username} (${result.userId})`);
    
  } catch (error) {
    Logger.log(`OAuth認証完了エラー: ${error}`);
    throw error;
  }
}

/**
 * 指定されたシートからランダムなツイートを投稿する関数（共通処理）
 */
function postRandomTweetWithSheet(sheetName: string): void {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。プロパティサービスで設定してください。');
    }
    
    XPoster.postRandomTweetForFirstUser(SPREADSHEET_ID, sheetName);
    
  } catch (error) {
    Logger.log(`ランダムツイート投稿エラー (${sheetName}): ${error}`);
    throw error;
  }
}

/**
 * 特定ユーザーでツイートを投稿する関数
 */
function postTweetForSpecificUser(userId: string, customText?: string): void {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。プロパティサービスで設定してください。');
    }
    
    XPoster.postTweetForUser(SPREADSHEET_ID, userId, customText);
    
  } catch (error) {
    Logger.log(`ユーザー指定ツイート投稿エラー: ${error}`);
    throw error;
  }
}

/**
 * 特定ユーザーで指定シートからツイートを投稿する関数
 */
function postTweetForSpecificUserWithSheet(userId: string, sheetName: string, customText?: string): void {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。プロパティサービスで設定してください。');
    }
    
    XPoster.postTweetForUser(SPREADSHEET_ID, userId, customText, sheetName);
    
  } catch (error) {
    Logger.log(`ユーザー指定ツイート投稿エラー (${sheetName}): ${error}`);
    throw error;
  }
}

/**
 * 認証情報の一覧を取得する関数
 */
function getAuthenticationList(): Array<{userId: string, userName: string, token: string, refreshToken: string}> {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。プロパティサービスで設定してください。');
    }
    
    return SpreadsheetManager.getAuthInfo(SPREADSHEET_ID);
    
  } catch (error) {
    Logger.log(`認証情報取得エラー: ${error}`);
    throw error;
  }
}

/**
 * ポスト内容一覧を取得する関数
 */
function getPostContentsList(sheetName: string = 'ポスト'): string[] {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。プロパティサービスで設定してください。');
    }
    
    return SpreadsheetManager.getPostContents(SPREADSHEET_ID, sheetName);
    
  } catch (error) {
    Logger.log(`ポスト内容取得エラー (${sheetName}): ${error}`);
    throw error;
  }
}

/**
 * すべてのユーザーのトークンをテストし、必要に応じて更新する関数
 */
function validateAndRefreshAllTokens(): void {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。プロパティサービスで設定してください。');
    }
    
    const authList = SpreadsheetManager.getAuthInfo(SPREADSHEET_ID);
    Logger.log(`総ユーザー数: ${authList.length}`);
    
    for (const user of authList) {
      Logger.log(`\n=== ユーザー ${user.userName} (${user.userId}) のトークンテスト開始 ===`);
      Logger.log(`アクセストークン存在: ${user.token ? 'あり' : 'なし'}`);
      Logger.log(`リフレッシュトークン存在: ${user.refreshToken ? 'あり' : 'なし'}`);
      
      const isValid = XPoster.testUserToken(SPREADSHEET_ID, user.userId);
      
      if (isValid) {
        Logger.log(`✅ ${user.userName}: トークン有効`);
      } else {
        Logger.log(`❌ ${user.userName}: トークン無効または更新失敗`);
      }
      Logger.log(`=== ユーザー ${user.userName} のテスト完了 ===\n`);
    }
    
  } catch (error) {
    Logger.log(`トークン検証エラー: ${error}`);
    throw error;
  }
}

/**
 * OAuth設定の診断を行う関数
 */
function diagnoseOAuthConfiguration(): void {
  try {
    const clientId = PropertiesService.getScriptProperties().getProperty('TWITTER_CLIENT_ID');
    const clientSecret = PropertiesService.getScriptProperties().getProperty('TWITTER_CLIENT_SECRET');
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    
    Logger.log('=== OAuth設定診断 ===');
    Logger.log(`TWITTER_CLIENT_ID: ${clientId ? '設定済み' : '未設定'}`);
    Logger.log(`TWITTER_CLIENT_SECRET: ${clientSecret ? '設定済み' : '未設定'}`);
    Logger.log(`SPREADSHEET_ID: ${spreadsheetId ? '設定済み' : '未設定'}`);
    
    if (!clientId || !clientSecret) {
      Logger.log('❌ OAuth設定が不完全です。Twitter APIの認証情報を確認してください。');
      return;
    }
    
    if (!spreadsheetId) {
      Logger.log('❌ スプレッドシートIDが設定されていません。');
      return;
    }
    
    Logger.log('✅ 基本設定は完了しています。');
    
    // 認証情報の確認
    try {
      const authList = SpreadsheetManager.getAuthInfo(spreadsheetId);
      Logger.log(`認証済みユーザー数: ${authList.length}`);
      
      if (authList.length === 0) {
        Logger.log('⚠️ 認証済みユーザーがいません。OAuth認証を実行してください。');
      }
    } catch (error) {
      Logger.log(`認証情報取得エラー: ${error}`);
    }
    
  } catch (error) {
    Logger.log(`OAuth設定診断エラー: ${error}`);
    throw error;
  }
}

/**
 * 指定ユーザーのアクセストークンを詳細診断する関数
 */
function diagnoseUserToken(userId: string): void {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。');
    }
    
    const authList = SpreadsheetManager.getAuthInfo(SPREADSHEET_ID, userId);
    
    if (authList.length === 0) {
      Logger.log(`❌ ユーザー ${userId} の認証情報が見つかりません`);
      return;
    }
    
    const user = authList[0];
    
    Logger.log(`\n=== ユーザー ${user.userName} (${user.userId}) のトークン詳細診断 ===`);
    Logger.log(`アクセストークン長: ${user.token ? user.token.length : 0}文字`);
    Logger.log(`リフレッシュトークン長: ${user.refreshToken ? user.refreshToken.length : 0}文字`);
    Logger.log(`アクセストークン先頭10文字: ${user.token ? user.token.substring(0, 10) + '...' : 'なし'}`);
    
    // Twitter APIでユーザー情報を取得してトークンをテスト
    Logger.log('Twitter API /users/me エンドポイントでトークンテスト中...');
    
    try {
      const options = {
        method: 'get' as const,
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch('https://api.twitter.com/2/users/me', options);
      const responseText = response.getContentText();
      const responseCode = response.getResponseCode();
      
      Logger.log(`レスポンスコード: ${responseCode}`);
      Logger.log(`レスポンス本文: ${responseText}`);
      
      if (responseCode === 200) {
        const userData = JSON.parse(responseText);
        Logger.log(`✅ トークン有効 - ユーザー: ${userData.data.username} (${userData.data.id})`);
      } else if (responseCode === 401) {
        Logger.log('❌ アクセストークンが無効です。リフレッシュを試行します。');
        
        // リフレッシュトークンでの更新を試行
        try {
          Logger.log('リフレッシュトークンを使用してアクセストークンを更新中...');
          const newTokens = XOAuth.refreshAccessToken(user.refreshToken);
          Logger.log('✅ トークン更新成功');
          Logger.log(`新しいアクセストークン長: ${newTokens.accessToken.length}文字`);
          Logger.log(`新しいアクセストークン先頭10文字: ${newTokens.accessToken.substring(0, 10)}...`);
        } catch (refreshError) {
          Logger.log(`❌ リフレッシュトークンも無効: ${refreshError}`);
        }
      } else {
        Logger.log(`⚠️ 予期しないレスポンス: ${responseCode} - ${responseText}`);
      }
      
    } catch (error) {
      Logger.log(`API呼び出しエラー: ${error}`);
    }
    
  } catch (error) {
    Logger.log(`トークン診断エラー: ${error}`);
    throw error;
  }
}

/**
 * 簡単なテスト投稿を行う関数（実際には投稿せず、API呼び出しまでの過程をテスト）
 */
function testTweetAPICall(userId: string, testText: string = "テスト投稿（実際には投稿されません）"): void {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。');
    }
    
    const authList = SpreadsheetManager.getAuthInfo(SPREADSHEET_ID, userId);
    
    if (authList.length === 0) {
      Logger.log(`❌ ユーザー ${userId} の認証情報が見つかりません`);
      return;
    }
    
    const user = authList[0];
    
    Logger.log(`\n=== ユーザー ${user.userName} のTwitter API呼び出しテスト ===`);
    Logger.log(`テストテキスト: ${testText}`);
    
    // リクエストボディを準備
    const requestBody = JSON.stringify({
      text: testText
    });
    
    Logger.log(`リクエストボディ: ${requestBody}`);
    Logger.log(`アクセストークン確認: ${user.token ? '存在' : '未設定'}`);
    Logger.log(`Authorization ヘッダー: Bearer ${user.token ? user.token.substring(0, 20) + '...' : 'なし'}`);
    
    // 注意：実際のAPI呼び出しは行わず、ここまでの情報をログ出力
    Logger.log('⚠️ 実際のAPI呼び出しはスキップします（テスト用）');
    Logger.log('実際の投稿を行う場合は、XPoster.postTweet() を使用してください');
    
  } catch (error) {
    Logger.log(`テスト投稿エラー: ${error}`);
    throw error;
  }
}

/**
 * Web App用のdoGet関数（OAuth 2.0認証用）
 */
function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput | GoogleAppsScript.Content.TextOutput {
  try {
    const authCode = e.parameter.code;
    const state = e.parameter.state;
    const error = e.parameter.error;
    
    // 認証URL取得リクエストの場合
    if (error) {
      // 認証エラーの場合
      const errorHtml = `
        <html>
          <head>
            <title>認証エラー</title>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .error { color: #d93025; }
            </style>
          </head>
          <body>
            <h1>❌ 認証エラー</h1>
            <p class="error">認証が拒否されました: ${error}</p>
            <p>もう一度認証を行う場合は、このページを再読み込みしてください。</p>
          </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(errorHtml);
    }
    
    if (authCode && state) {
      // OAuth認証完了処理
      completeOAuthAuthentication(authCode, state);
      
      const html = `
        <html>
          <head>
            <title>認証完了</title>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .success { color: #1a73e8; }
              .info { background-color: #e8f0fe; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1>✅ Twitter認証が完了しました</h1>
            <div class="info">
              <p>認証情報がスプレッドシートに保存されました。</p>
              <p>OAuth 2.0による安全な認証が完了しています。</p>
              <p>「ポスト」シートからランダムにツイート内容を選択して投稿します。</p>
            </div>
            <p>このウィンドウを閉じてください。</p>
          </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(html);
    } else {
      // OAuth認証開始 - リダイレクトURLを取得して表示
      const webAppUrl = ScriptApp.getService().getUrl();
      
      // 認証URLを生成（エラーの場合はエラーメッセージ）
      let authUrl = '';
      let authUrlError = '';
      try {
        authUrl = XOAuth.getAuthorizationUrl();
      } catch (error) {
        authUrlError = `認証URL生成エラー: ${error}`;
      }
      
      const html = `
        <html>
          <head>
            <title>Twitter OAuth 2.0認証</title>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .info { background-color: #e8f0fe; padding: 15px; border-radius: 5px; margin: 20px 0; }
              .features { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
              .url-box { background-color: #f1f3f4; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; word-break: break-all; border: 1px solid #dadce0; }
              .feature-list { list-style: none; padding: 0; }
              .feature-list li { margin: 8px 0; }
              .feature-list li:before { content: "✅ "; color: #34a853; }
              .copy-button { background-color: #34a853; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px; }
              .copy-button:hover { background-color: #2d8e41; }
              .current-url { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #34a853; }
              .auth-url { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7; }
              .error { background-color: #fce8e6; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #d93025; color: #d93025; }
              .auth-link { color: #1d9bf0; text-decoration: none; font-weight: bold; }
              .auth-link:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <h1>🔐 Twitter OAuth 2.0認証</h1>
            
            <div class="current-url">
              <h3>📍 現在のWebアプリURL</h3>
              <p>このページのURL（認証設定で使用）:</p>
              <div class="url-box">
                ${webAppUrl}
                <button class="copy-button" onclick="copyToClipboard('${webAppUrl}')">📋 コピー</button>
              </div>
              <p><small>※ このURLをTwitter Developer PortalのCallback URLとして設定してください</small></p>
            </div>
            
            ${authUrl ? `
            <div class="auth-url">
              <h3>🔗 Twitter認証URL</h3>
              <p>以下のURLをクリックまたはコピーしてTwitter認証を開始:</p>
              <div class="url-box">
                <a href="${authUrl}" target="_blank" class="auth-link">${authUrl}</a>
                <button class="copy-button" onclick="copyToClipboard('${authUrl}')">📋 コピー</button>
              </div>
              <p><small>※ 新しいタブでTwitter認証ページが開きます</small></p>
            </div>
            ` : ''}
            
            ${authUrlError ? `
            <div class="error">
              <h3>❌ 認証URL生成エラー</h3>
              <p>${authUrlError}</p>
              <p><strong>設定を確認してください：</strong></p>
              <ul>
                <li>TWITTER_CLIENT_ID が正しく設定されているか</li>
                <li>TWITTER_CLIENT_SECRET が正しく設定されているか</li>
                <li>SPREADSHEET_ID が正しく設定されているか</li>
              </ul>
            </div>
            ` : ''}
            
            <div class="info">
              <p><strong>OAuth 2.0 + PKCE</strong>による安全な認証を使用しています。</p>
              <p>認証後、以下の権限でアクセスできるようになります：</p>
              <ul class="feature-list">
                <li>ツイートの読み取り</li>
                <li>ツイートの投稿</li>
                <li>ユーザー情報の取得</li>
                <li>オフラインアクセス（リフレッシュトークン）</li>
              </ul>
            </div>
            
            <div class="features">
              <h3>📊 自動ポスト機能</h3>
              <ul class="feature-list">
                <li>「ポスト」シートでのツイート内容管理</li>
                <li>複数アカウント対応</li>
                <li>ランダム投稿</li>
                <li>自動トークン更新</li>
              </ul>
            </div>
            
            <script>
              function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(function() {
                  alert('URLがクリップボードにコピーされました！');
                }, function(err) {
                  console.error('コピーに失敗しました: ', err);
                  prompt('URLをコピーしてください:', text);
                });
              }
            </script>
          </body>
        </html>
      `;
      
      return HtmlService.createHtmlOutput(html);
    }
    
  } catch (error) {
    Logger.log(`doGet エラー: ${error}`);
    
    const webAppUrl = ScriptApp.getService().getUrl();
    
    const errorHtml = `
      <html>
        <head>
          <title>エラー</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { color: #d93025; background-color: #fce8e6; padding: 15px; border-radius: 5px; }
            .url-box { background-color: #f1f3f4; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; word-break: break-all; }
          </style>
        </head>
        <body>
          <h1>❌ エラーが発生しました</h1>
          <div class="error">
            <p><strong>エラー内容:</strong> ${error}</p>
          </div>
          <p>設定を確認してください：</p>
          <ul>
            <li>TWITTER_CLIENT_ID が正しく設定されているか</li>
            <li>TWITTER_CLIENT_SECRET が正しく設定されているか</li>
            <li>SPREADSHEET_ID が正しく設定されているか</li>
            <li>WebアプリのURLがTwitter Developer Portalに登録されているか</li>
          </ul>
          
          <h3>📋 リダイレクトURL（Twitter Developer Portalに設定）:</h3>
          <div class="url-box">${webAppUrl}</div>
        </body>
      </html>
    `;
    
    return HtmlService.createHtmlOutput(errorHtml);
  }
}

/**
 * 定期実行用の関数（posts_1シート用）
 */
function scheduledTweet1(): void {
  try {
    postRandomTweetWithSheet('posts_1');
    Logger.log('✅ 定期ツイート投稿が完了しました (posts_1)');
  } catch (error) {
    Logger.log(`❌ 定期ツイート投稿エラー (posts_1): ${error}`);
  }
}

/**
 * 定期実行用の関数（posts_2シート用）
 */
function scheduledTweet2(): void {
  try {
    postRandomTweetWithSheet('posts_2');
    Logger.log('✅ 定期ツイート投稿が完了しました (posts_2)');
  } catch (error) {
    Logger.log(`❌ 定期ツイート投稿エラー (posts_2): ${error}`);
  }
}

/**
 * 定期実行用の関数（posts_3シート用）
 */
function scheduledTweet3(): void {
  try {
    postRandomTweetWithSheet('posts_3');
    Logger.log('✅ 定期ツイート投稿が完了しました (posts_3)');
  } catch (error) {
    Logger.log(`❌ 定期ツイート投稿エラー (posts_3): ${error}`);
  }
}

/**
 * テスト用の関数
 */
function testFunction(): void {
  try {
    Logger.log('=== OAuth 2.0対応テスト開始 ===');
    
    // スプレッドシートIDチェック
    Logger.log(`SPREADSHEET_ID: ${SPREADSHEET_ID}`);
    
    // Client ID チェック
    const clientId = PropertiesService.getScriptProperties().getProperty('TWITTER_CLIENT_ID');
    Logger.log(`TWITTER_CLIENT_ID設定済み: ${!!clientId}`);
    
    // 認証情報取得テスト
    const authList = getAuthenticationList();
    Logger.log(`認証済みユーザー数: ${authList.length}`);
    
    // 各シートのポスト内容取得テスト
    const sheetNames = ['ポスト', 'posts_1', 'posts_2', 'posts_3'];
    
    for (const sheetName of sheetNames) {
      try {
        const postContents = getPostContentsList(sheetName);
        Logger.log(`${sheetName}シートのポスト内容数: ${postContents.length}`);
        
        if (postContents.length > 0) {
          Logger.log(`${sheetName}シートのサンプルポスト内容: ${postContents[0]}`);
        }
      } catch (error) {
        Logger.log(`${sheetName}シートのポスト内容取得エラー: ${error}`);
      }
    }
    
    // トークン検証テスト
    if (authList.length > 0) {
      Logger.log('--- トークン検証テスト ---');
      validateAndRefreshAllTokens();
    }
    
    // 新しいscheduledTweet関数のテスト（実際の投稿はしない）
    Logger.log('--- 新しいscheduledTweet関数のテスト ---');
    Logger.log('scheduledTweet1: posts_1シート用');
    Logger.log('scheduledTweet2: posts_2シート用');
    Logger.log('scheduledTweet3: posts_3シート用');
    
    Logger.log('=== テスト完了 ===');
    
  } catch (error) {
    Logger.log(`テストエラー: ${error}`);
  }
}

/**
 * 無効なトークンを持つユーザーをクリーンアップする関数
 */
function cleanupInvalidTokens(): void {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。');
    }
    
    const authList = SpreadsheetManager.getAuthInfo(SPREADSHEET_ID);
    Logger.log(`=== 無効トークンのクリーンアップ開始 ===`);
    Logger.log(`対象ユーザー数: ${authList.length}`);
    
    const invalidUsers: string[] = [];
    
    for (const user of authList) {
      Logger.log(`\n--- ユーザー ${user.userName} (${user.userId}) のトークン検証 ---`);
      
      // アクセストークンのテスト
      const isAccessTokenValid = XOAuth.testAccessToken(user.token);
      Logger.log(`アクセストークン: ${isAccessTokenValid ? '有効' : '無効'}`);
      
      if (!isAccessTokenValid) {
        // リフレッシュトークンのテスト
        try {
          Logger.log('リフレッシュトークンを使用してアクセストークンの更新を試行...');
          const newTokens = XOAuth.refreshAccessToken(user.refreshToken);
          Logger.log('✅ リフレッシュ成功 - トークンを更新します');
          
          // スプレッドシートのトークンを更新
          const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
          const authSheet = spreadsheet.getSheetByName('認証情報');
          if (authSheet) {
            const lastRow = authSheet.getLastRow();
            const data = authSheet.getRange(2, 1, lastRow - 1, 4).getValues();
            
            for (let i = 0; i < data.length; i++) {
              if (data[i][0].toString() === user.userId) {
                authSheet.getRange(i + 2, 3).setValue(newTokens.accessToken);
                authSheet.getRange(i + 2, 4).setValue(newTokens.refreshToken);
                Logger.log(`ユーザー ${user.userName} のトークンを更新しました`);
                break;
              }
            }
          }
          
        } catch (refreshError) {
          Logger.log(`❌ リフレッシュ失敗: ${refreshError}`);
          Logger.log(`ユーザー ${user.userName} は再認証が必要です`);
          invalidUsers.push(`${user.userName} (${user.userId})`);
        }
      } else {
        Logger.log(`✅ ユーザー ${user.userName} のトークンは有効です`);
      }
    }
    
    Logger.log(`\n=== クリーンアップ結果 ===`);
    if (invalidUsers.length === 0) {
      Logger.log('✅ すべてのユーザーのトークンが有効です');
    } else {
      Logger.log(`❌ 以下のユーザーは再認証が必要です:`);
      invalidUsers.forEach(user => Logger.log(`  - ${user}`));
      Logger.log(`\n再認証手順:`);
      Logger.log(`1. WebアプリのURLにアクセス: ${ScriptApp.getService().getUrl()}`);
      Logger.log(`2. Twitter認証を実行`);
      Logger.log(`3. 認証完了後、再度投稿をお試しください`);
    }
    
  } catch (error) {
    Logger.log(`クリーンアップエラー: ${error}`);
    throw error;
  }
}

/**
 * 特定ユーザーの認証情報を削除する関数
 */
function removeUserAuth(userId: string): void {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません。');
    }
    
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const authSheet = spreadsheet.getSheetByName('認証情報');
    
    if (!authSheet) {
      Logger.log('認証情報シートが見つかりません');
      return;
    }
    
    const lastRow = authSheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('認証情報が存在しません');
      return;
    }
    
    const data = authSheet.getRange(2, 1, lastRow - 1, 4).getValues();
    
    for (let i = 0; i < data.length; i++) {
      if (data[i][0].toString() === userId) {
        // 該当行を削除
        authSheet.deleteRow(i + 2);
        Logger.log(`✅ ユーザー ${userId} の認証情報を削除しました`);
        Logger.log(`再認証が必要です: ${ScriptApp.getService().getUrl()}`);
        return;
      }
    }
    
    Logger.log(`ユーザー ${userId} の認証情報が見つかりませんでした`);
    
  } catch (error) {
    Logger.log(`認証情報削除エラー: ${error}`);
    throw error;
  }
}

/**
 * 再認証が必要なユーザー向けの案内情報を表示する関数
 */
function showReAuthenticationGuide(): void {
  const webAppUrl = ScriptApp.getService().getUrl();
  
  Logger.log('\n=== 再認証ガイド ===');
  Logger.log('トークンが無効になったユーザーは以下の手順で再認証してください：');
  Logger.log('');
  Logger.log('1. 以下のURLにアクセス:');
  Logger.log(`   ${webAppUrl}`);
  Logger.log('');
  Logger.log('2. 「Twitter認証URL」をクリック');
  Logger.log('');
  Logger.log('3. Twitterで認証を許可');
  Logger.log('');
  Logger.log('4. 認証完了後、再度投稿をお試しください');
  Logger.log('');
  Logger.log('※ 認証は各ユーザーごとに個別に実行する必要があります');
  Logger.log('=================');
} 