/**
 * X(Twitter) OAuth 2.0認証クラス（PKCE対応）
 */
class XOAuth {
  private static readonly TWITTER_API_BASE_URL = 'https://api.twitter.com';
  private static readonly OAUTH_BASE_URL = 'https://twitter.com/i/oauth2';
  
  // Twitter API credentials - これらは実際のアプリケーションでは環境変数やProperties Serviceで管理
  private static readonly CLIENT_ID = PropertiesService.getScriptProperties().getProperty('TWITTER_CLIENT_ID') || '';
  private static readonly CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty('TWITTER_CLIENT_SECRET') || '';
  
  // OAuth 2.0のスコープ
  private static readonly SCOPES = 'tweet.read tweet.write users.read offline.access';
  
  /**
   * PKCE用のコードチャレンジを生成
   */
  private static generateCodeChallenge(): {codeVerifier: string, codeChallenge: string} {
    // Code Verifierを生成（43-128文字のランダム文字列）
    const codeVerifier = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').substring(0, 10);
    
    // Code Challenge を生成（SHA256ハッシュのBase64URL）
    const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, codeVerifier);
    const codeChallenge = Utilities.base64EncodeWebSafe(hash).replace(/=/g, '');
    
    return { codeVerifier, codeChallenge };
  }
  
  /**
   * オブジェクトをクエリ文字列に変換
   */
  private static buildQueryString(params: {[key: string]: string}): string {
    return Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }
  
  /**
   * OAuth 2.0認証のステップ1: 認証URLを生成
   */
  public static getAuthorizationUrl(): string {
    try {
      const { codeVerifier, codeChallenge } = this.generateCodeChallenge();
      const state = Utilities.getUuid();
      const redirectUri = ScriptApp.getService().getUrl();
      
      // PKCEパラメータをProperties Serviceに保存
      PropertiesService.getScriptProperties().setProperties({
        'oauth_code_verifier': codeVerifier,
        'oauth_state': state
      });
      
      // 認証URLのパラメータ
      const authParams = {
        'response_type': 'code',
        'client_id': this.CLIENT_ID,
        'redirect_uri': redirectUri,
        'scope': this.SCOPES,
        'state': state,
        'code_challenge': codeChallenge,
        'code_challenge_method': 'S256'
      };
      
      const authUrl = `${this.OAUTH_BASE_URL}/authorize?${this.buildQueryString(authParams)}`;
      Logger.log(`認証URL: ${authUrl}`);
      
      return authUrl;
      
    } catch (error) {
      Logger.log(`OAuth認証URL生成エラー: ${error}`);
      throw error;
    }
  }
  
  /**
   * OAuth 2.0認証のステップ2: アクセストークンを取得
   */
  public static getAccessToken(authCode: string, state: string): {accessToken: string, refreshToken: string, userId: string, username: string} {
    try {
      // Stateパラメータの検証
      const savedState = PropertiesService.getScriptProperties().getProperty('oauth_state');
      if (state !== savedState) {
        throw new Error('State parameter mismatch - potential CSRF attack');
      }
      
      const codeVerifier = PropertiesService.getScriptProperties().getProperty('oauth_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier not found');
      }
      
      const redirectUri = ScriptApp.getService().getUrl();
      
      // アクセストークン取得のリクエストボディ
      const tokenParams = {
        'grant_type': 'authorization_code',
        'client_id': this.CLIENT_ID,
        'code': authCode,
        'redirect_uri': redirectUri,
        'code_verifier': codeVerifier
      };
      
      // Basic認証ヘッダー（Client IDとClient Secretを使用）
      const credentials = Utilities.base64Encode(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`);
      
      const options = {
        method: 'post' as const,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        payload: this.buildQueryString(tokenParams)
      };
      
      const response = UrlFetchApp.fetch('https://api.twitter.com/2/oauth2/token', options);
      const responseText = response.getContentText();
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        const tokenData = JSON.parse(responseText);
        
        // ユーザー情報を取得
        const userInfo = this.getUserInfo(tokenData.access_token);
        
        // 使用済みのPKCEパラメータを削除
        PropertiesService.getScriptProperties().deleteProperty('oauth_code_verifier');
        PropertiesService.getScriptProperties().deleteProperty('oauth_state');
        
        return {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          userId: userInfo.id,
          username: userInfo.username
        };
        
      } else {
        throw new Error(`アクセストークン取得エラー: ${responseCode} - ${responseText}`);
      }
      
    } catch (error) {
      Logger.log(`アクセストークン取得エラー: ${error}`);
      throw error;
    }
  }
  
  /**
   * リフレッシュトークンを使用してアクセストークンを更新
   */
  public static refreshAccessToken(refreshToken: string): {accessToken: string, refreshToken: string} {
    try {
      const tokenParams = {
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken,
        'client_id': this.CLIENT_ID
      };
      
      const credentials = Utilities.base64Encode(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`);
      
      const options = {
        method: 'post' as const,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        payload: this.buildQueryString(tokenParams)
      };
      
      const response = UrlFetchApp.fetch('https://api.twitter.com/2/oauth2/token', options);
      const responseText = response.getContentText();
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        const tokenData = JSON.parse(responseText);
        
        return {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken // 新しいリフレッシュトークンがない場合は既存のものを使用
        };
        
      } else {
        throw new Error(`トークン更新エラー: ${responseCode} - ${responseText}`);
      }
      
    } catch (error) {
      Logger.log(`トークン更新エラー: ${error}`);
      throw error;
    }
  }
  
  /**
   * アクセストークンを使用してユーザー情報を取得
   */
  private static getUserInfo(accessToken: string): {id: string, username: string, name: string} {
    try {
      const options = {
        method: 'get' as const,
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      };
      
      const response = UrlFetchApp.fetch('https://api.twitter.com/2/users/me', options);
      const responseText = response.getContentText();
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        const userData = JSON.parse(responseText);
        return {
          id: userData.data.id,
          username: userData.data.username,
          name: userData.data.name
        };
      } else {
        throw new Error(`ユーザー情報取得エラー: ${responseCode} - ${responseText}`);
      }
      
    } catch (error) {
      Logger.log(`ユーザー情報取得エラー: ${error}`);
      throw error;
    }
  }
  
  /**
   * アクセストークンの有効性をテスト
   */
  public static testAccessToken(accessToken: string): boolean {
    try {
      this.getUserInfo(accessToken);
      return true;
    } catch (error) {
      Logger.log(`アクセストークンテストエラー: ${error}`);
      return false;
    }
  }
} 