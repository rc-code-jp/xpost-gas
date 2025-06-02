/**
 * X(Twitter)ポスト機能クラス（OAuth 2.0対応）
 */
class XPoster {
  private static readonly TWITTER_API_BASE_URL = 'https://api.twitter.com';
  
  /**
   * ツイートを投稿（OAuth 2.0 Bearer token使用）
   */
  public static postTweet(accessToken: string, refreshToken: string, tweetText: string, spreadsheetId: string, userId: string): {success: boolean, message: string, tweetId?: string, newTokens?: {accessToken: string, refreshToken: string}} {
    try {
      const postUrl = 'https://api.twitter.com/2/tweets';
      
      // リクエストボディ
      const requestBody = JSON.stringify({
        text: tweetText
      });
      
      const options = {
        method: 'post' as const,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        payload: requestBody
      };
      
      const response = UrlFetchApp.fetch(postUrl, options);
      const responseText = response.getContentText();
      const responseCode = response.getResponseCode();
      
      if (responseCode === 201) {
        const responseData = JSON.parse(responseText);
        Logger.log(`ツイート投稿成功: ${responseData.data.id}`);
        return {
          success: true,
          message: 'ツイートが正常に投稿されました',
          tweetId: responseData.data.id
        };
      } else if (responseCode === 401) {
        // アクセストークンが期限切れの場合、リフレッシュを試行
        Logger.log('アクセストークンが期限切れ、リフレッシュを試行します');
        
        try {
          const newTokens = XOAuth.refreshAccessToken(refreshToken);
          
          // スプレッドシートの認証情報を更新
          this.updateTokensInSpreadsheet(spreadsheetId, userId, newTokens.accessToken, newTokens.refreshToken);
          
          // 新しいトークンで再試行
          const retryOptions = {
            method: 'post' as const,
            headers: {
              'Authorization': `Bearer ${newTokens.accessToken}`,
              'Content-Type': 'application/json'
            },
            payload: requestBody
          };
          
          const retryResponse = UrlFetchApp.fetch(postUrl, retryOptions);
          const retryResponseText = retryResponse.getContentText();
          const retryResponseCode = retryResponse.getResponseCode();
          
          if (retryResponseCode === 201) {
            const retryResponseData = JSON.parse(retryResponseText);
            Logger.log(`トークン更新後のツイート投稿成功: ${retryResponseData.data.id}`);
            return {
              success: true,
              message: 'トークン更新後にツイートが正常に投稿されました',
              tweetId: retryResponseData.data.id,
              newTokens: newTokens
            };
          } else {
            return {
              success: false,
              message: `トークン更新後の投稿エラー: ${retryResponseCode} - ${retryResponseText}`
            };
          }
          
        } catch (refreshError) {
          return {
            success: false,
            message: `トークン更新エラー: ${refreshError}`
          };
        }
        
      } else {
        Logger.log(`ツイート投稿エラー: ${responseCode} - ${responseText}`);
        return {
          success: false,
          message: `投稿エラー: ${responseCode} - ${responseText}`
        };
      }
      
    } catch (error) {
      Logger.log(`ツイート投稿例外エラー: ${error}`);
      return {
        success: false,
        message: `例外エラー: ${error}`
      };
    }
  }
  
  /**
   * スプレッドシートの認証情報を更新
   */
  private static updateTokensInSpreadsheet(spreadsheetId: string, userId: string, newAccessToken: string, newRefreshToken: string): void {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const authSheet = spreadsheet.getSheetByName('認証情報');
      
      if (!authSheet) {
        throw new Error('認証情報シートが見つかりません');
      }
      
      const lastRow = authSheet.getLastRow();
      if (lastRow <= 1) {
        return;
      }
      
      const data = authSheet.getRange(2, 1, lastRow - 1, 4).getValues();
      
      for (let i = 0; i < data.length; i++) {
        if (data[i][0].toString() === userId) {
          // トークンを更新
          authSheet.getRange(i + 2, 3).setValue(newAccessToken); // C列: token
          authSheet.getRange(i + 2, 4).setValue(newRefreshToken); // D列: refresh_token
          Logger.log(`ユーザー ${userId} のトークンを更新しました`);
          break;
        }
      }
      
    } catch (error) {
      Logger.log(`トークン更新エラー: ${error}`);
      throw error;
    }
  }
  
  /**
   * 最初のユーザーでランダムツイート投稿
   */
  public static postRandomTweetForFirstUser(spreadsheetId: string, sheetName: string = 'ポスト'): void {
    try {
      // 認証情報を取得
      const authList = SpreadsheetManager.getAuthInfo(spreadsheetId);
      
      if (authList.length === 0) {
        Logger.log('認証情報が見つかりません');
        return;
      }
      
      // 最初のユーザーを選択
      const selectedUser = authList[0];
      
      // ランダムなポスト内容を取得
      const postContent = SpreadsheetManager.getRandomPostContent(spreadsheetId, sheetName);
      
      Logger.log(`選択されたユーザー: ${selectedUser.userName}`);
      Logger.log(`投稿内容: ${postContent}`);
      Logger.log(`使用シート: ${sheetName}`);
      
      // ツイート投稿
      const result = this.postTweet(selectedUser.token, selectedUser.refreshToken, postContent, spreadsheetId, selectedUser.userId);
      
      if (result.success) {
        Logger.log(`✅ ツイート投稿完了: ${selectedUser.userName} - ${result.tweetId}`);
        if (result.newTokens) {
          Logger.log('🔄 トークンが更新されました');
        }
      } else {
        Logger.log(`❌ ツイート投稿失敗: ${selectedUser.userName} - ${result.message}`);
      }
      
    } catch (error) {
      Logger.log(`ランダムツイート投稿エラー: ${error}`);
    }
  }
  
  /**
   * 特定ユーザーでツイート投稿
   */
  public static postTweetForUser(spreadsheetId: string, userId: string, customText?: string, sheetName: string = 'ポスト'): void {
    try {
      // 指定ユーザーの認証情報を取得
      const authList = SpreadsheetManager.getAuthInfo(spreadsheetId, userId);
      
      if (authList.length === 0) {
        Logger.log(`ユーザー ${userId} の認証情報が見つかりません`);
        return;
      }
      
      const user = authList[0];
      
      // 投稿内容を決定（カスタムテキストがあればそれを使用、なければランダム選択）
      const postContent = customText || SpreadsheetManager.getRandomPostContent(spreadsheetId, sheetName);
      
      Logger.log(`投稿ユーザー: ${user.userName}`);
      Logger.log(`投稿内容: ${postContent}`);
      Logger.log(`使用シート: ${sheetName}`);
      
      // ツイート投稿
      const result = this.postTweet(user.token, user.refreshToken, postContent, spreadsheetId, user.userId);
      
      if (result.success) {
        Logger.log(`✅ ツイート投稿完了: ${user.userName} - ${result.tweetId}`);
        if (result.newTokens) {
          Logger.log('🔄 トークンが更新されました');
        }
      } else {
        Logger.log(`❌ ツイート投稿失敗: ${user.userName} - ${result.message}`);
      }
      
    } catch (error) {
      Logger.log(`ユーザー指定ツイート投稿エラー: ${error}`);
    }
  }
  
  /**
   * アクセストークンの有効性をテスト
   */
  public static testUserToken(spreadsheetId: string, userId: string): boolean {
    try {
      const authList = SpreadsheetManager.getAuthInfo(spreadsheetId, userId);
      
      if (authList.length === 0) {
        Logger.log(`ユーザー ${userId} の認証情報が見つかりません`);
        return false;
      }
      
      const user = authList[0];
      const isValid = XOAuth.testAccessToken(user.token);
      
      if (!isValid) {
        Logger.log(`ユーザー ${user.userName} のアクセストークンが無効です。リフレッシュを試行します。`);
        
        try {
          const newTokens = XOAuth.refreshAccessToken(user.refreshToken);
          this.updateTokensInSpreadsheet(spreadsheetId, userId, newTokens.accessToken, newTokens.refreshToken);
          Logger.log(`ユーザー ${user.userName} のトークンが更新されました`);
          return true;
        } catch (refreshError) {
          Logger.log(`トークン更新失敗: ${refreshError}`);
          return false;
        }
      }
      
      return isValid;
      
    } catch (error) {
      Logger.log(`トークンテストエラー: ${error}`);
      return false;
    }
  }
} 