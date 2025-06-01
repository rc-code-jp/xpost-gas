/**
 * スプレッドシート管理クラス
 */
class SpreadsheetManager {
  
  /**
   * 認証情報をスプレッドシートに保存
   */
  public static saveAuthInfo(spreadsheetId: string, userId: string, userName: string, accessToken: string, refreshToken: string): void {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      let authSheet = spreadsheet.getSheetByName('認証情報');
      
      // 認証情報シートが存在しない場合は作成
      if (!authSheet) {
        authSheet = spreadsheet.insertSheet('認証情報');
        authSheet.getRange(1, 1, 1, 4).setValues([['user_id', 'user_name', 'token', 'refresh_token']]);
      }
      
      // 既存のユーザー情報があるかチェック
      const lastRow = authSheet.getLastRow();
      let existingRowIndex = -1;
      
      if (lastRow > 1) {
        const userIds = authSheet.getRange(2, 1, lastRow - 1, 1).getValues();
        existingRowIndex = userIds.findIndex((row: any) => row[0] === userId);
      }
      
      const newRow = [userId, userName, accessToken, refreshToken];
      
      if (existingRowIndex >= 0) {
        // 既存のユーザー情報を更新
        authSheet.getRange(existingRowIndex + 2, 1, 1, 4).setValues([newRow]);
        Logger.log(`ユーザー ${userName} の認証情報を更新しました`);
      } else {
        // 新しいユーザー情報を追加
        authSheet.getRange(lastRow + 1, 1, 1, 4).setValues([newRow]);
        Logger.log(`ユーザー ${userName} の認証情報を追加しました`);
      }
      
    } catch (error) {
      Logger.log(`認証情報保存エラー: ${error}`);
      throw error;
    }
  }
  
  /**
   * 認証情報をスプレッドシートから取得
   */
  public static getAuthInfo(spreadsheetId: string, userId?: string): Array<{userId: string, userName: string, token: string, refreshToken: string}> {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const authSheet = spreadsheet.getSheetByName('認証情報');
      
      if (!authSheet) {
        throw new Error('認証情報シートが見つかりません');
      }
      
      const lastRow = authSheet.getLastRow();
      if (lastRow <= 1) {
        return [];
      }
      
      const data = authSheet.getRange(2, 1, lastRow - 1, 4).getValues();
      const authList = data.map((row: any[]) => ({
        userId: row[0].toString(),
        userName: row[1].toString(),
        token: row[2].toString(),
        refreshToken: row[3].toString()
      }));
      
      if (userId) {
        return authList.filter((auth: any) => auth.userId === userId);
      }
      
      return authList;
      
    } catch (error) {
      Logger.log(`認証情報取得エラー: ${error}`);
      throw error;
    }
  }
  
  /**
   * ポスト内容をスプレッドシートから取得
   */
  public static getPostContents(spreadsheetId: string, sheetName: string = 'ポスト'): string[] {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      let postSheet = spreadsheet.getSheetByName(sheetName);
      
      // ポストシートが存在しない場合は作成
      if (!postSheet) {
        postSheet = spreadsheet.insertSheet(sheetName);
        postSheet.getRange(1, 1).setValue('post_content');
        // サンプルデータを追加
        const samplePosts = [
          'こんにちは！今日も一日頑張ります 💪',
          'プログラミングって楽しいですね！ #coding',
          'お疲れ様でした！今日も良い一日でした ✨',
          '新しいことを学ぶのは素晴らしいです 📚',
          'みなさんも良い一日をお過ごしください 🌟',
          'X(Twitter)のOAuth 2.0認証が完成しました！ #TwitterAPI',
          'Google Apps Scriptで自動ポストシステム作成中 #GAS',
          'TypeScriptでのGAS開発、型安全性が素晴らしい ⚡'
        ];
        
        for (let i = 0; i < samplePosts.length; i++) {
          postSheet.getRange(i + 2, 1).setValue(samplePosts[i]);
        }
        
        Logger.log(`${sheetName}シートを作成し、サンプルデータを追加しました`);
      }
      
      const lastRow = postSheet.getLastRow();
      if (lastRow <= 1) {
        return [];
      }
      
      const contents = postSheet.getRange(2, 1, lastRow - 1, 1).getValues()
        .map((row: any[]) => row[0].toString())
        .filter((content: string) => content.trim() !== '');
      
      return contents;
      
    } catch (error) {
      Logger.log(`ポスト内容取得エラー: ${error}`);
      throw error;
    }
  }
  
  /**
   * ランダムなポスト内容を選択
   */
  public static getRandomPostContent(spreadsheetId: string, sheetName: string = 'ポスト'): string {
    const contents = this.getPostContents(spreadsheetId, sheetName);
    
    if (contents.length === 0) {
      throw new Error('ポスト内容が見つかりません');
    }
    
    const randomIndex = Math.floor(Math.random() * contents.length);
    const selectedContent = contents[randomIndex];
    
    Logger.log(`ランダム選択されたポスト内容: ${selectedContent}`);
    return selectedContent;
  }
} 