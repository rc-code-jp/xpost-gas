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
    
    for (const user of authList) {
      Logger.log(`ユーザー ${user.userName} のトークンをテスト中...`);
      const isValid = XPoster.testUserToken(SPREADSHEET_ID, user.userId);
      
      if (isValid) {
        Logger.log(`✅ ${user.userName}: トークン有効`);
      } else {
        Logger.log(`❌ ${user.userName}: トークン無効または更新失敗`);
      }
    }
    
  } catch (error) {
    Logger.log(`トークン検証エラー: ${error}`);
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