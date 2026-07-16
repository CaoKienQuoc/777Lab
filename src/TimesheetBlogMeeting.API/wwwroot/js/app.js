/* =========================================================================
   app.js — khởi tạo trang chính: bảo vệ đăng nhập, header, chuyển tab, đa ngôn ngữ
   ========================================================================= */

const LANG = localStorage.getItem('lang') || 'vi';
const LANG_KEYS = {
  vi: {
    admin: 'Quản trị viên', customer: 'Người dùng', logout: 'Đăng xuất',
    blog: 'Blog', leave: 'Phép tồn', timesheet: 'Chấm công', meeting: 'Lịch họp', regulation: 'Quy định', users: 'Người dùng',
    addNew: '+ Đăng bài mới', addRow: '+ Thêm dòng', importExcel: '⬇ Import Excel', exportExcel: '⬆ Xuất Excel',
    exportExcelSm: '⬇ Xuất Excel', addNewUser: '+ Thêm người dùng', downloadTemplate: 'Tải file mẫu',
    searchPlaceholder: 'Tìm kiếm...', tsSearchPlaceholder: 'Tìm kiếm tên...',
    internalSystem: 'Hệ thống nội bộ', createAccount: 'Tạo tài khoản mới', noAccount: 'Chưa có tài khoản?', hasAccount: 'Đã có tài khoản?', login: 'Đăng nhập', register: 'Đăng ký',
    blogAndPosts: 'Blog & Bài viết', newPost: '+ Đăng bài mới', emptyBlog: 'Chưa có bài viết nào.', emptyBlogHint: 'Nhấn “Đăng bài mới” để tạo bài viết đầu tiên.', editPost: 'Sửa bài viết', newPostTitle: 'Đăng bài mới', postDetail: 'Bài viết', cancel: 'Huỷ', save: 'Lưu thay đổi',     post: 'Đăng bài',
    regulationAndDocs: 'Quy định', emptyRegulation: 'Chưa có quy định nào.', emptyRegulationHint: 'Nhấn "Thêm quy định" để tạo quy định đầu tiên.', editRegulation: 'Sửa quy định', newRegulationTitle: 'Thêm quy định', regulationDetail: 'Quy định', postRegulation: 'Đăng quy định', addNewRegulation: '+ Thêm quy định', deleteRegulation: 'Xoá quy định', deleteRegulationConfirm: 'Bạn có chắc chắn muốn xoá quy định này? Hành động không thể hoàn tác.', deleteRegulationDone: 'Đã xoá quy định.', regulationSaved: 'Đã cập nhật quy định.', regulationCreated: 'Đã đăng quy định.',
    deletePost: 'Xoá bài viết', deletePostConfirm: 'Bạn có chắc chắn muốn xoá bài viết này? Hành động không thể hoàn tác.', deletePostDone: 'Đã xoá bài viết.', postSaved: 'Đã cập nhật bài viết.', postCreated: 'Đã đăng bài viết.', close: 'Đóng', title: 'Tiêu đề', content: 'Nội dung', image: 'Hình ảnh (tuỳ chọn)', selectImage: '📷 Bấm để chọn ảnh (JPG, PNG, GIF, WEBP — tối đa 5MB)', removeImage: 'Xoá ảnh hiện tại', pleaseEnterTitleAndContent: 'Vui lòng nhập tiêu đề và nội dung.', saving: 'Đang lưu...', wantToDelete: 'Bạn có chắc muốn xoá?', by: 'bởi', schedulePost: 'Thời Gian', postedAt: 'Đăng lúc', scheduledToday: 'Hôm nay có {n} bài viết theo lịch', newBlogToast: 'Có {n} bài viết mới', scheduleNoPast: 'Không thể chọn ngày trong quá khứ.', notifTitle: 'Thông báo', notifEmpty: 'Chưa có thông báo nào.', notifMarkAll: 'Đánh dấu đã đọc', notifBlogNew: 'Bài viết mới', notifMeetingReminder: 'Nhắc lịch họp', notifPrev: '‹ Trước', notifNext: 'Sau ›', rteBold: 'In đậm', rteItalic: 'In nghiêng', rteUnderline: 'Gạch chân', rteFont: 'Font chữ', rteSize: 'Cỡ chữ', rteSizeS: 'Nhỏ', rteSizeM: 'Vừa', rteSizeL: 'Lớn', rteSizeXL: 'Rất lớn', rteColor: 'Màu chữ',
    timesheetTitle: 'Bảng chấm công', noTimesheet: 'Chưa có dữ liệu chấm công.', noTimesheetMatch: 'Không có dữ liệu phù hợp.', tsAdminHint: 'Hãy import file báo cáo chấm công (.xlsx).', tsUserHint: 'Vui lòng quay lại sau.', addRowTitle: 'Thêm dòng chấm công', editRowTitle: 'Sửa dòng chấm công', name: 'Họ và tên', date: 'Ngày', hours: 'Số giờ công', timeIn: 'Giờ vào', timeOut: 'Giờ ra', morning: 'Buổi sáng', afternoon: 'Buổi chiều', clockIn: 'Vào làm', clockOut: 'Ra nghỉ', note: 'Ghi chú', action: 'Thao tác', deleteRow: 'Xoá dòng', deleteRowConfirm: 'Xoá dòng chấm công này?', rowDeleted: 'Đã xoá.', importTitle: 'Import Excel', replaceConfirm: 'Xoá toàn bộ dữ liệu cũ trước khi import', importHint: 'File cần có dòng tiêu đề ở hàng đầu (Họ tên, Ngày, Giờ vào, Giờ ra, Số giờ, Ghi chú). Tải “file mẫu” nếu chưa rõ định dạng.', startImport: 'Bắt đầu import', importing: 'Đang xử lý...', importedMsg: 'Đã import', rowsSkipped: 'dòng lỗi bị bỏ qua', noName: 'Vui lòng nhập họ tên.', noDate: 'Vui lòng chọn ngày.', addDone: 'Đã thêm dòng.', editDone: 'Đã cập nhật.', weekday: 'Thứ', status: 'Trạng thái', seqNo: 'STT', allMonths: 'Tất cả tháng', monthWord: 'Tháng', tsPeopleUnit: 'nhân viên', tsImportReportHint: 'Chọn file báo cáo chấm công (.xlsx) xuất từ máy chấm công. Hệ thống tự dò từng nhân viên và bảng chấm công theo ngày, thay thế toàn bộ dữ liệu hiện có.',
    leaveTitle: 'Phép tồn', noLeave: 'Chưa có bảng phép tồn.', leaveAdminHint: 'Hãy bấm <b>Import Excel</b> — bảng sẽ được dựng theo đúng các cột trong file của bạn.', leaveUserHint: 'Vui lòng quay lại sau.', addLeaveTitle: 'Thêm dòng phép tồn', editLeaveTitle: 'Sửa dòng phép tồn', pleaseEnterOneCell: 'Vui lòng nhập ít nhất một ô.', leaveSaved: 'Đã cập nhật.', leaveAdded: 'Đã thêm dòng.', deleteLeaveConfirm: 'Xoá dòng phép tồn này?', leaveDeleted: 'Đã xoá.', importLeaveTitle: 'Import Excel', importLeaveHint: 'Bảng sẽ được <b>dựng lại theo đúng các cột trong file</b> (thay thế toàn bộ dữ liệu hiện tại). Chương trình tự dò sheet và dòng tiêu đề.', leaveImportedMsg: 'Đã import',
    meetingTitle: 'Đặt lịch họp', selectDay: 'Chọn một ngày trên lịch để xem khung giờ và đặt lịch họp.', cannotBookPast: 'Không thể đặt lịch cho ngày đã qua. Bạn vẫn có thể xem các cuộc họp bên dưới.', startTime: 'Giờ bắt đầu', endTime: 'Giờ kết thúc', meetingTitleLabel: 'Tiêu đề cuộc họp', desc: 'Mô tả (tuỳ chọn)', book: 'Đặt lịch họp', booking: 'Đang đặt lịch...', booked: 'Đã đặt lịch họp thành công.', noMeeting: 'Chưa có cuộc họp nào trong ngày này.', meetingsToday: 'Cuộc họp trong ngày', cancelMeeting: 'Huỷ lịch họp', cancelMeetingConfirm: 'Bạn có chắc muốn huỷ cuộc họp này?', meetingCancelled: 'Đã huỷ cuộc họp.', timeRangeErr: 'Thời gian họp phải nằm trong khoảng 08:00 – 18:00.', endAfterStart: 'Giờ kết thúc phải sau giờ bắt đầu.', minDuration: 'Thời lượng họp tối thiểu 30 phút.', noTitle: 'Vui lòng nhập tiêu đề cuộc họp.', conflictWith: 'Trùng lịch với cuộc họp', nothing: '(tuỳ chọn)', editMeeting: 'Chỉnh sửa', cancelEdit: 'Huỷ sửa', saveMeetingChanges: 'Lưu thay đổi', meetingUpdated: 'Đã cập nhật cuộc họp.', titleSuggest: 'Gợi ý nhanh:', reminderSoon: 'Sắp đến giờ họp', reminderInMin: 'còn {n} phút', reminderStartingNow: 'Cuộc họp bắt đầu ngay bây giờ',
    usersTitle: 'Quản lý người dùng', noUser: 'Chưa có người dùng.', username: 'Tên đăng nhập', fullName: 'Họ và tên', role: 'Vai trò', createdAt: 'Ngày tạo', customerLabel: 'Người dùng (Customer)', adminLabel: 'Quản trị viên (Admin)', addUserTitle: 'Thêm người dùng', editUserTitle: 'Sửa người dùng', password: 'Mật khẩu', resetPassword: 'Đặt lại mật khẩu', resetPasswordConfirm: 'Đặt lại mật khẩu cho tài khoản', resetPasswordNote: 'Mật khẩu sẽ được đặt lại thành User@123.', resetPasswordDone: 'Đã đặt lại mật khẩu về User@123.', leaveEmptyIfNoChange: 'Để trống nếu không đổi', minPassword: 'Tối thiểu 8 ký tự', specialCharRequired: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (vd: @, #, !, %).', usernameRule: 'Tên đăng nhập không được chứa dấu hoặc ký tự đặc biệt (chỉ chữ a-z, 0-9, dấu gạch dưới).', createSuccess: 'Đã tạo tài khoản.', updateSuccess: 'Đã cập nhật người dùng.', userDeleted: 'Đã xoá người dùng.', pleaseEnterFullName: 'Vui lòng nhập họ tên.', pleaseEnterUsername: 'Vui lòng nhập tên đăng nhập.', deleteUserConfirm: 'Xoá tài khoản', deleteUserWarning: 'Toàn bộ bài viết và lịch họp của người này cũng sẽ bị xoá.', rootAdminNote: '(mặc định)', defaultAccount: 'Tài khoản admin mặc định', cannotChangeRole: 'Không thể đổi vai trò của tài khoản admin mặc định.', createBtn: 'Tạo tài khoản',
    invalidFile: 'Ảnh vượt quá 5MB.', rowDeletedMsg: 'Đã xoá.', availableLater: 'Vui lòng quay lại sau.', pastMeeting: 'Không thể đặt lịch cho ngày đã qua.',
    meetingInfo: 'Người đặt:', importXlsWarning: 'File cần có dòng tiêu đề ở hàng đầu (Họ tên, Ngày, Giờ vào, Giờ ra, Số giờ, Ghi chú). Tải “file mẫu” nếu chưa rõ định dạng.', templateBtn: 'Tải file mẫu',
    internal: 'Hệ thống nội bộ', usernamePlaceholder: 'Nhập tên đăng nhập', passwordPlaceholder: 'Nhập mật khẩu', loginBtn: 'Đăng nhập', fullNamePlaceholder: 'Nhập họ và tên', usernameShortHint: 'Ít nhất 3 ký tự', passwordLongHint: 'Ít nhất 6 ký tự', confirmPassword: 'Nhập lại mật khẩu', confirmPasswordPlaceholder: 'Nhập lại mật khẩu', registerBtn: 'Tạo tài khoản',
    emailPromptTitle: 'Bổ sung email', emailPromptHint: 'Tài khoản của bạn chưa có email. Hãy bổ sung để nhận email thông báo khi có bài viết mới.', emailLabel: 'Email', emailInput: 'Nhập địa chỉ email', emailLater: 'Để sau', emailSaveBtn: 'Lưu email', emailInvalid: 'Email không hợp lệ.', emailSaved: 'Đã lưu email. Cảm ơn bạn!', emailSaveFail: 'Lưu email thất bại.',
    profileTitle: 'Chỉnh sửa thông tin', profilePwHint: 'Đổi mật khẩu (để trống nếu không đổi)', currentPassword: 'Mật khẩu hiện tại', newPassword: 'Mật khẩu mới', confirmNewPassword: 'Xác nhận mật khẩu mới', profileSave: 'Lưu', profileSaved: 'Đã cập nhật thông tin.', profileNoChange: 'Bạn chưa thay đổi gì.', pwTooShort: 'Mật khẩu mới phải có ít nhất 6 ký tự.', pwMismatch: 'Mật khẩu xác nhận không khớp.'
  },
  ja: {
    admin: '管理者', customer: 'ユーザー', logout: 'ログアウト',
    blog: 'ブログ', leave: '休暇残数', timesheet: '勤怠', meeting: '会議予約', regulation: '規定', users: 'ユーザー管理',
    addNew: '+ 新規投稿', addRow: '+ 行を追加', importExcel: '⬇ Excelインポート', exportExcel: '⬆ Excelエクスポート',
    exportExcelSm: '⬇ Excelエクスポート', addNewUser: '+ ユーザー追加', downloadTemplate: 'テンプレート',
    searchPlaceholder: '検索...', tsSearchPlaceholder: '名前検索...',
    internalSystem: '社内システム', createAccount: 'アカウント作成', noAccount: 'アカウントをお持ちでないですか？', hasAccount: 'すでにアカウントをお持ちですか？', login: 'ログイン', register: '新規登録',
    blogAndPosts: 'ブログ・記事', newPost: '+ 新規投稿', emptyBlog: 'まだ記事がありません。', emptyBlogHint: '「新規投稿」をクリックして最初の記事を作成してください。', editPost: '記事を編集', newPostTitle: '新規投稿', postDetail: '記事', cancel: 'キャンセル', save: '変更を保存', post: '投稿する',
    regulationAndDocs: '規定', emptyRegulation: 'まだ規定がありません。', emptyRegulationHint: '「規定を追加」をクリックして最初の規定を作成してください。', editRegulation: '規定を編集', newRegulationTitle: '規定を追加', regulationDetail: '規定', postRegulation: '投稿する', addNewRegulation: '+ 規定を追加', deleteRegulation: '規定を削除', deleteRegulationConfirm: 'この規定を削除してもよろしいですか？この操作は元に戻せません。', deleteRegulationDone: '規定を削除しました。', regulationSaved: '規定を更新しました。', regulationCreated: '規定を投稿しました。',
    deletePost: '記事を削除', deletePostConfirm: 'この記事を削除してもよろしいですか？この操作は元に戻せません。', deletePostDone: '記事を削除しました。', postSaved: '記事を更新しました。', postCreated: '記事を投稿しました。', close: '閉じる', title: 'タイトル', content: '内容', image: '画像（任意）', selectImage: '📷 画像を選択 (JPG, PNG, GIF, WEBP — 最大5MB)', removeImage: '現在の画像を削除', pleaseEnterTitleAndContent: 'タイトルと内容を入力してください。', saving: '保存中...', wantToDelete: '削除してもよろしいですか？', by: '投稿者', schedulePost: '公開予約（任意）', postedAt: '投稿日時', scheduledToday: '本日予定されている記事が{n}件あります', newBlogToast: '新しい記事が{n}件あります', scheduleNoPast: '過去の日付は選択できません。', notifTitle: '通知', notifEmpty: '通知はありません。', notifMarkAll: 'すべて既読', notifBlogNew: '新しい記事', notifMeetingReminder: '会議リマインド', notifPrev: '‹ 前へ', notifNext: '次へ ›', rteBold: '太字', rteItalic: '斜体', rteUnderline: '下線', rteFont: 'フォント', rteSize: '文字サイズ', rteSizeS: '小', rteSizeM: '標準', rteSizeL: '大', rteSizeXL: '特大', rteColor: '文字色',
    timesheetTitle: '勤怠表', noTimesheet: '勤怠データがありません。', noTimesheetMatch: '一致するデータがありません。', tsAdminHint: '勤怠報告ファイル(.xlsx)をインポートしてください。', tsUserHint: '後でもう一度確認してください。', addRowTitle: '勤怠行を追加', editRowTitle: '勤怠行を編集', name: '名前', date: '日付', hours: '勤務時間', timeIn: '出勤時間', timeOut: '退勤時間', morning: '午前', afternoon: '午後', clockIn: '出勤', clockOut: '退勤', note: '備考', action: '操作', deleteRow: '行を削除', deleteRowConfirm: 'この勤怠行を削除してもよろしいですか？', rowDeleted: '削除しました。', importTitle: 'Excelインポート', replaceConfirm: 'インポート前に既存データをすべて削除', importHint: 'ファイルの先頭にヘッダー行が必要です（名前、日付、出勤時間、退勤時間、勤務時間、備考）。形式がわからない場合は「テンプレート」をダウンロードしてください。', startImport: 'インポート開始', importing: '処理中...', importedMsg: 'インポート完了：', rowsSkipped: '件のエラー行をスキップ', noName: '名前を入力してください。', noDate: '日付を選択してください。', addDone: '行を追加しました。', editDone: '更新しました。', weekday: '曜日', status: 'ステータス', seqNo: 'No.', allMonths: '全月', monthWord: '月', tsPeopleUnit: '名', tsImportReportHint: '勤怠機からエクスポートした報告ファイル(.xlsx)を選択してください。各社員と日次表を自動検出し、既存データをすべて置き換えます。',
    leaveTitle: '休暇残数', noLeave: '休暇残数テーブルがありません。', leaveAdminHint: '<b>Excelインポート</b>をクリックしてください — テーブルはファイルの列に基づいて作成されます。', leaveUserHint: '後でもう一度確認してください。', addLeaveTitle: '休暇残数行を追加', editLeaveTitle: '休暇残数行を編集', pleaseEnterOneCell: '少なくとも1つのセルを入力してください。', leaveSaved: '更新しました。', leaveAdded: '行を追加しました。', deleteLeaveConfirm: 'この休暇残数行を削除してもよろしいですか？', leaveDeleted: '削除しました。', importLeaveTitle: 'Excelインポート', importLeaveHint: '<b>ファイルの列に基づいてテーブルが再構築されます</b>（既存データはすべて置き換え）。プログラムがシートとヘッダー行を自動検出します。', leaveImportedMsg: 'インポート完了：',
    meetingTitle: '会議予約', selectDay: 'カレンダーから日付を選択して時間枠を確認し、会議を予約してください。', cannotBookPast: 'この日は過去の日付のため予約できません。下記の会議を参照できます。', startTime: '開始時間', endTime: '終了時間', meetingTitleLabel: '会議タイトル', desc: '説明（任意）', book: '会議を予約', booking: '予約中...', booked: '会議の予約が完了しました。', noMeeting: 'この日には会議がありません。', meetingsToday: '当日の会議', cancelMeeting: '会議をキャンセル', cancelMeetingConfirm: 'この会議をキャンセルしてもよろしいですか？', meetingCancelled: '会議をキャンセルしました。', timeRangeErr: '会議時間は 08:00～18:00 の範囲で指定してください。', endAfterStart: '終了時間は開始時間より後に設定してください。', minDuration: '会議時間は30分以上にしてください。', noTitle: '会議タイトルを入力してください。', conflictWith: '次の会議と重複しています：', nothing: '（任意）', editMeeting: '編集', cancelEdit: '編集をキャンセル', saveMeetingChanges: '変更を保存', meetingUpdated: '会議を更新しました。', titleSuggest: 'クイック候補：', reminderSoon: 'まもなく会議の時間です', reminderInMin: 'あと{n}分', reminderStartingNow: '会議がまもなく始まります',
    usersTitle: 'ユーザー管理', noUser: 'ユーザーがいません。', username: 'ユーザー名', fullName: '氏名', role: '役割', createdAt: '作成日', customerLabel: 'ユーザー (Customer)', adminLabel: '管理者 (Admin)', addUserTitle: 'ユーザーを追加', editUserTitle: 'ユーザーを編集', password: 'パスワード', resetPassword: 'パスワードをリセット', resetPasswordConfirm: '次のアカウントのパスワードをリセットしますか：', resetPasswordNote: 'パスワードは User@123 にリセットされます。', resetPasswordDone: 'パスワードを User@123 にリセットしました。', leaveEmptyIfNoChange: '変更しない場合は空欄', minPassword: 'パスワードは8文字以上', specialCharRequired: 'パスワードに特殊文字を1文字以上含める必要があります（例：@, #, !, %）。', usernameRule: 'ユーザー名には特殊文字や空白を使用できません（a-z, 0-9, _ のみ）。', createSuccess: 'アカウントを作成しました。', updateSuccess: 'ユーザー情報を更新しました。', deleteUserConfirm: 'ユーザーを削除', deleteUserWarning: 'このユーザーの記事と会議もすべて削除されます。', rootAdminNote: '(デフォルト)', defaultAccount: 'デフォルト管理者アカウント', cannotChangeRole: 'デフォルト管理者アカウントの役割は変更できません。', createBtn: 'アカウント作成',
    invalidFile: '画像サイズが5MBを超えています。', rowDeletedMsg: '削除しました。', availableLater: '後でもう一度確認してください。', pastMeeting: 'この日は過去の日付のため予約できません。',
    meetingInfo: '予約者：', importXlsWarning: 'ファイルの先頭にヘッダー行が必要です（名前、日付、出勤時間、退勤時間、勤務時間、備考）。形式がわからない場合は「テンプレート」をダウンロードしてください。', templateBtn: 'テンプレート',
    internal: '社内システム', usernamePlaceholder: 'ユーザー名を入力', passwordPlaceholder: 'パスワードを入力', loginBtn: 'ログイン', fullNamePlaceholder: '氏名を入力', usernameShortHint: '最小3文字', passwordLongHint: '最小6文字', confirmPassword: 'パスワード再入力', confirmPasswordPlaceholder: 'パスワードを再入力してください', registerBtn: 'アカウント作成',
    emailPromptTitle: 'メールアドレスの追加', emailPromptHint: 'メールアドレスが未登録です。新しい記事の通知を受け取るために登録してください。', emailLabel: 'メールアドレス', emailInput: 'メールアドレスを入力', emailLater: '後で', emailSaveBtn: '保存', emailInvalid: 'メールアドレスが正しくありません。', emailSaved: 'メールアドレスを保存しました。', emailSaveFail: '保存に失敗しました。',
    profileTitle: 'プロフィール編集', profilePwHint: 'パスワード変更（変更しない場合は空欄）', currentPassword: '現在のパスワード', newPassword: '新しいパスワード', confirmNewPassword: '新しいパスワード（確認）', profileSave: '保存', profileSaved: '情報を更新しました。', profileNoChange: '変更はありません。', pwTooShort: '新しいパスワードは6文字以上にしてください。', pwMismatch: '確認用パスワードが一致しません。'
  },
};

function t(key) { return LANG_KEYS[LANG][key] || key; }
function setLang(lang) {
  localStorage.setItem('lang', lang);
  location.reload();
}

// --- Bảo vệ: chưa đăng nhập -> về trang login ---
const currentUser = getUser();
if (!getToken() || !currentUser) {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('user-fullname').textContent = currentUser.fullName || currentUser.username;
  // Bấm vào tên -> mở popup chỉnh sửa thông tin (email + mật khẩu)
  const nameEl = document.getElementById('user-fullname');
  nameEl.style.cursor = 'pointer';
  nameEl.title = t('profileTitle');
  nameEl.addEventListener('click', openProfileModal);
  const tag = document.getElementById('user-role-tag');
  if (currentUser.role === 'Admin') {
    tag.textContent = t('admin');
    tag.className = 'role-tag role-admin';
    document.getElementById('tab-users').classList.remove('hidden');
  } else {
    tag.textContent = t('customer');
    tag.className = 'role-tag role-customer';
  }

  document.getElementById('logout-btn').textContent = t('logout');
  document.getElementById('logout-btn').addEventListener('click', logout);

  // Language flag click
  document.getElementById('lang-flag').addEventListener('click', () => {
    setLang(LANG === 'vi' ? 'ja' : 'vi');
  });

  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    const tabKey = tab.dataset.view;
    if (LANG_KEYS.vi[tabKey]) tab.innerHTML = tab.innerHTML.replace(/(<span class="ico">.*<\/span> )(.+)/, `$1${t(tabKey)}`);
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  [initBlog, initRegulation, initTimesheet, initLeave, initMeeting].forEach(fn => {
    try { fn(); } catch (e) { console.error(fn.name + ' lỗi:', e); }
  });
  if (isAdmin()) { try { initUsers(); } catch (e) { console.error('initUsers lỗi:', e); } }

  // Language-specific elements
  document.getElementById('lang-flag').src = LANG === 'vi' ? 'https://flagcdn.com/vn.svg' : 'https://flagcdn.com/jp.svg';
  document.getElementById('lang-flag').alt = LANG.toUpperCase();

  // Re-apply i18n to static HTML elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (LANG_KEYS[LANG] && LANG_KEYS[LANG][key]) el.textContent = LANG_KEYS[LANG][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (LANG_KEYS[LANG] && LANG_KEYS[LANG][key]) el.placeholder = LANG_KEYS[LANG][key];
  });
  const titleEl = document.querySelector('[data-i18n-title]');
  if (titleEl && LANG_KEYS[LANG]) {
    const key = titleEl.getAttribute('data-i18n-title');
    if (LANG_KEYS[LANG][key]) titleEl.textContent = LANG_KEYS[LANG][key];
  }

  const defaultView = window.location.hash.slice(1) || 'blog';
  switchView(defaultView);

  // Trung tâm thông báo (chuông) — khởi tạo trước để các nguồn có thể đẩy thông báo vào
  try { initNotifs(); } catch (e) { console.error('initNotifs lỗi:', e); }
  // Theo dõi bài viết mới: badge trên tab Blog + toast, tự kiểm tra định kỳ
  try { startBlogNotify(); } catch (e) { console.error('startBlogNotify lỗi:', e); }
  // Real-time toàn site: tự cập nhật khi có thao tác thay đổi dữ liệu
  try { startRealtime(); } catch (e) { console.error('startRealtime lỗi:', e); }
  // Nhắc lịch họp: hiện toast định kỳ trong 20 phút trước giờ họp (chạy mọi tab)
  try { startMeetingReminders(); } catch (e) { console.error('startMeetingReminders lỗi:', e); }
  // Kiểm tra bài viết theo lịch vào lúc nửa đêm
  try { startScheduledCheck(); } catch (e) { console.error('startScheduledCheck lỗi:', e); }

  // Nhắc tài khoản chưa có email bổ sung email
  try { checkEmailPrompt(); } catch (e) { console.error('checkEmailPrompt lỗi:', e); }
});

function switchView(view) {
  if (view === 'users' && !isAdmin()) view = 'blog';

  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.view').forEach(v =>
    v.classList.toggle('active', v.id === 'view-' + view));

  history.replaceState(null, '', '#' + view);

  if (view === 'blog') {
    loadBlogs();
    markBlogSeen();
  } else {
    if (view === 'timesheet') loadTimesheet();
    else if (view === 'leave') loadLeave();
    else if (view === 'regulation') loadRegulations();
    else if (view === 'meeting') loadMeetings();
    else if (view === 'users') loadUsers();
  }
}

function reloadView(view) {
  if (view === 'blog') loadBlogs();
  else if (view === 'timesheet') loadTimesheet();
  else if (view === 'leave') loadLeave();
  else if (view === 'regulation') loadRegulations();
  else if (view === 'meeting') loadMeetings();
  else if (view === 'users') loadUsers();
}

/* =========================================================================
   Real-time SignalR — server báo có thao tác thay đổi dữ liệu, client cập nhật
   ngay để tránh hiển thị chậm hoặc thao tác trùng lặp giữa nhiều người dùng.
   ========================================================================= */
let _rtConn = null;

function onResourceChanged(info) {
  const res = info && info.resource;
  if (!res) return;
  // Blog có cơ chế riêng (badge + toast khi không mở tab)
  if (res === 'blog') { try { onBlogChanged(); } catch (e) { console.error(e); } return; }
  // Quy định có cơ chế riêng
  if (res === 'regulation') { try { onRegulationChanged(); } catch (e) { console.error(e); } return; }
  // Lịch họp thay đổi: cập nhật cache nhắc lịch dù không mở tab Lịch họp
  if (res === 'meeting') { try { loadReminderMeetings(); } catch (e) { /* bỏ qua */ } }
  // Các view khác: chỉ tải lại khi người dùng đang mở đúng view đó
  const sec = document.getElementById('view-' + res);
  if (sec && sec.classList.contains('active')) reloadView(res);
}

function startRealtime() {
  if (!window.signalR || _rtConn) return;
  _rtConn = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/app', { accessTokenFactory: () => getToken() })
    .withAutomaticReconnect()
    .build();
  _rtConn.on('resourceChanged', onResourceChanged);
  // Sau khi nối lại (rớt mạng) -> đồng bộ view đang mở + badge blog
  _rtConn.onreconnected(() => {
    const active = document.querySelector('.tab.active');
    if (active) reloadView(active.dataset.view);
    try { checkNewBlogs(false); } catch (e) { /* bỏ qua */ }
  });
  _rtConn.start().catch(err => console.error('SignalR lỗi:', err));
}

/* =========================================================================
   Trung tâm thông báo (chuông) — lưu client theo từng user (localStorage).
   Nguồn: bài viết mới (blog.js) + nhắc lịch họp (meeting.js).
   Mới nhất nằm trên cùng; bấm -> mở đúng trang/việc liên quan.
   ========================================================================= */
const NOTIF_MAX = 50;
const NOTIF_PAGE_SIZE = 10;
let _notifPage = 0;

function _notifKey() { const u = getUser(); return 'notifs_' + ((u && u.userId) || 'anon'); }
function getNotifs() { try { return JSON.parse(localStorage.getItem(_notifKey())) || []; } catch (e) { return []; } }
function saveNotifs(list) { localStorage.setItem(_notifKey(), JSON.stringify(list.slice(0, NOTIF_MAX))); }

// Thêm 1 thông báo (key để tránh trùng, vd cùng một bài viết / cùng một mốc nhắc)
function addNotif(n) {
  const list = getNotifs();
  if (n.key && list.some(x => x.key === n.key)) return;
  list.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    key: n.key || null, type: n.type || 'info',
    title: n.title || '', body: n.body || '',
    view: n.view || null, refId: n.refId || null,
    at: new Date().toISOString(), read: false
  });
  saveNotifs(list);
  renderNotifBell();
  const panel = document.getElementById('notif-panel');
  if (panel && !panel.classList.contains('hidden')) renderNotifPanel();
}
function unreadNotifCount() { return getNotifs().filter(n => !n.read).length; }
function markNotifRead(id) { const l = getNotifs(); const x = l.find(n => n.id === id); if (x) x.read = true; saveNotifs(l); renderNotifBell(); }
function markAllNotifsRead() { const l = getNotifs(); l.forEach(n => n.read = true); saveNotifs(l); renderNotifBell(); _notifPage = 0; renderNotifPanel(); }

function renderNotifBell() {
  const c = document.getElementById('notif-count');
  if (!c) return;
  const n = unreadNotifCount();
  if (n > 0) { c.textContent = n > 99 ? '99+' : String(n); c.classList.remove('hidden'); }
  else c.classList.add('hidden');
}
function notifIcon(type) { return type === 'meeting' ? '⏰' : (type === 'blog' ? '📰' : '🔔'); }
function renderNotifPanel() {
  const box = document.getElementById('notif-list');
  if (!box) return;
  const all = getNotifs();
  if (!all.length) { box.innerHTML = `<div class="notif-empty">${t('notifEmpty')}</div>`; return; }

  const start = _notifPage * NOTIF_PAGE_SIZE;
  const page = all.slice(start, start + NOTIF_PAGE_SIZE);
  const totalPages = Math.ceil(all.length / NOTIF_PAGE_SIZE);

  let html = page.map(n => `
    <div class="notif-item${n.read ? '' : ' unread'}" data-notif="${n.id}">
      <span class="notif-item-ico">${notifIcon(n.type)}</span>
      <div class="notif-item-main">
        <div class="notif-item-title">${escapeHtml(n.title)}</div>
        ${n.body ? `<div class="notif-item-body">${escapeHtml(n.body)}</div>` : ''}
        <div class="notif-item-time">${formatDateTime(n.at)}</div>
      </div>
    </div>`).join('');

  if (totalPages > 1) {
    html += `<div class="notif-pages">`;
    if (_notifPage > 0)
      html += `<button class="notif-page-btn" data-notif-prev>${t('notifPrev')}</button>`;
    html += `<span class="notif-page-info">${_notifPage + 1}/${totalPages}</span>`;
    if (_notifPage < totalPages - 1)
      html += `<button class="notif-page-btn" data-notif-next>${t('notifNext')}</button>`;
    html += `</div>`;
  }

  box.innerHTML = html;
  box.querySelectorAll('[data-notif]').forEach(el =>
    el.addEventListener('click', () => openNotif(el.dataset.notif)));
  const prevBtn = box.querySelector('[data-notif-prev]');
  if (prevBtn) prevBtn.addEventListener('click', () => { _notifPage--; renderNotifPanel(); });
  const nextBtn = box.querySelector('[data-notif-next]');
  if (nextBtn) nextBtn.addEventListener('click', () => { _notifPage++; renderNotifPanel(); });
}
function openNotif(id) {
  const n = getNotifs().find(x => x.id === id);
  if (!n) return;
  markNotifRead(id);
  closeNotifPanel();
  if (n.view) {
    switchView(n.view);
    if (n.view === 'blog' && n.refId) setTimeout(() => { try { openBlogDetail(n.refId); } catch (e) { /* bài có thể đã bị xoá */ } }, 180);
  }
}
function toggleNotifPanel() {
  const p = document.getElementById('notif-panel');
  if (!p) return;
  if (p.classList.contains('hidden')) { _notifPage = 0; renderNotifPanel(); p.classList.remove('hidden'); }
  else p.classList.add('hidden');
}
function closeNotifPanel() { const p = document.getElementById('notif-panel'); if (p) p.classList.add('hidden'); }
function initNotifs() {
  const bell = document.getElementById('notif-bell');
  if (!bell) return;
  // Admin là người đăng bài Blog nên không cần chuông thông báo -> ẩn hẳn chuông cho Admin.
  if (typeof isAdmin === 'function' && isAdmin()) {
    const wrap = bell.closest('.notif-wrap');
    if (wrap) wrap.classList.add('hidden');
    return;
  }
  const titleEl = document.getElementById('notif-title'); if (titleEl) titleEl.textContent = t('notifTitle');
  const markEl = document.getElementById('notif-mark-all'); if (markEl) markEl.textContent = t('notifMarkAll');
  bell.title = t('notifTitle');
  bell.addEventListener('click', (e) => { e.stopPropagation(); toggleNotifPanel(); });
  if (markEl) markEl.addEventListener('click', (e) => { e.stopPropagation(); markAllNotifsRead(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.notif-wrap')) closeNotifPanel(); });
  renderNotifBell();
}

/* =========================================================================
   Nhắc bổ sung email cho tài khoản chưa có email.
   Khi vào trang chính: hỏi /api/auth/me; nếu chưa có email -> hiện modal nhập.
   Có email rồi -> không hiện.
   ========================================================================= */
async function checkEmailPrompt() {
  let me;
  try { me = await api('/api/auth/me'); } catch (e) { return; }
  if (!me) return;
  if (me.email) {
    const u = getUser(); if (u && !u.email) { u.email = me.email; persistUser(u); }
    return; // đã có email -> không hiển thị
  }
  openEmailPrompt();
}

function openEmailPrompt() {
  const body =
    '<p style="margin:0 0 14px;color:var(--muted-text,#666)">' + escapeHtml(t('emailPromptHint')) + '</p>' +
    '<div class="field">' +
      '<label for="supp-email">' + escapeHtml(t('emailLabel')) + '</label>' +
      '<input type="email" id="supp-email" autocomplete="email" placeholder="' + escapeHtml(t('emailInput')) + '" />' +
    '</div>';
  const foot =
    '<button class="btn" id="supp-email-later">' + escapeHtml(t('emailLater')) + '</button>' +
    '<button class="btn btn-primary" id="supp-email-save">' + escapeHtml(t('emailSaveBtn')) + '</button>';
  openModal(t('emailPromptTitle'), body, foot);
  document.getElementById('supp-email-later').addEventListener('click', closeModal);
  document.getElementById('supp-email-save').addEventListener('click', submitSuppEmail);
  const inp = document.getElementById('supp-email');
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitSuppEmail(); } });
  setTimeout(() => inp.focus(), 60);
}

async function submitSuppEmail() {
  const inp = document.getElementById('supp-email');
  const email = (inp.value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast(t('emailInvalid'), 'err'); inp.focus(); return; }
  const btn = document.getElementById('supp-email-save');
  btn.disabled = true;
  try {
    await api('/api/auth/email', { method: 'POST', body: { email } });
    const u = getUser(); if (u) { u.email = email; persistUser(u); }
    closeModal();
    showToast(t('emailSaved'), 'ok');
  } catch (err) {
    showToast((err && err.message) || t('emailSaveFail'), 'err');
    btn.disabled = false;
  }
}

/* =========================================================================
   Popup chỉnh sửa thông tin cá nhân (bấm vào tên) — đổi email + mật khẩu.
   ========================================================================= */
async function openProfileModal() {
  let email = '';
  try { const me = await api('/api/auth/me'); email = (me && me.email) || ''; } catch (e) { /* vẫn mở popup */ }
  const body =
    '<div class="field"><label for="pf-email">' + escapeHtml(t('emailLabel')) + '</label>' +
    '<input type="email" id="pf-email" autocomplete="email" value="' + escapeHtml(email) + '" placeholder="' + escapeHtml(t('emailInput')) + '" /></div>' +
    '<hr style="border:none;border-top:1px solid var(--line,#eee);margin:16px 0" />' +
    '<p style="margin:0 0 10px;color:var(--muted-text,#666);font-size:13px">' + escapeHtml(t('profilePwHint')) + '</p>' +
    '<div class="field"><label for="pf-cur">' + escapeHtml(t('currentPassword')) + '</label>' +
    '<input type="password" id="pf-cur" autocomplete="current-password" /></div>' +
    '<div class="field"><label for="pf-new">' + escapeHtml(t('newPassword')) + '</label>' +
    '<input type="password" id="pf-new" autocomplete="new-password" /></div>' +
    '<div class="field"><label for="pf-new2">' + escapeHtml(t('confirmNewPassword')) + '</label>' +
    '<input type="password" id="pf-new2" autocomplete="new-password" /></div>';
  const foot =
    '<button class="btn" id="pf-cancel">' + escapeHtml(t('cancel')) + '</button>' +
    '<button class="btn btn-primary" id="pf-save">' + escapeHtml(t('profileSave')) + '</button>';
  openModal(t('profileTitle'), body, foot);
  document.getElementById('pf-cancel').addEventListener('click', closeModal);
  document.getElementById('pf-save').addEventListener('click', () => saveProfile(email));
}

async function saveProfile(currentEmail) {
  const email = (document.getElementById('pf-email').value || '').trim();
  const cur = document.getElementById('pf-cur').value;
  const nw = document.getElementById('pf-new').value;
  const nw2 = document.getElementById('pf-new2').value;

  const emailChanging = email && email.toLowerCase() !== (currentEmail || '').toLowerCase();
  const pwChanging = !!nw;

  if (!emailChanging && !pwChanging) { showToast(t('profileNoChange'), 'err'); return; }
  if (emailChanging && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast(t('emailInvalid'), 'err'); return; }
  if (pwChanging) {
    if (nw.length < 6) { showToast(t('pwTooShort'), 'err'); return; }
    if (nw !== nw2) { showToast(t('pwMismatch'), 'err'); return; }
  }

  const btn = document.getElementById('pf-save'); btn.disabled = true;
  try {
    if (pwChanging) await api('/api/auth/password', { method: 'POST', body: { currentPassword: cur, newPassword: nw } });
    if (emailChanging) {
      await api('/api/auth/email', { method: 'POST', body: { email } });
      const u = getUser(); if (u) { u.email = email.toLowerCase(); persistUser(u); }
    }
    closeModal();
    showToast(t('profileSaved'), 'ok');
  } catch (err) {
    showToast((err && err.message) || 'Đã xảy ra lỗi.', 'err');
    btn.disabled = false;
  }
}
