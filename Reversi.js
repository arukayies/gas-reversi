/*
参考情報
https://teratail.com/questions/1766"Z"
この回答にあったコードを参考
回答者:https://github.com/katoy
———————————–*/
/* スクリプトプロパティ情報を取得 */
const prop = PropertiesService.getScriptProperties();

/* シート情報を取得 */
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sh = ss.getActiveSheet();

/* 石の定義 */
const STONE_BLACK = '=IMAGE("https://drive.google.com/uc?export=download&id=1UNMP2KZys7SkMXcef_PaFqFmTGzoAj-K")';
const STONE_WHITE = '=IMAGE("https://drive.google.com/uc?export=download&id=1LuNQiU5p4-4-h6RE5n7y6VBrvCZL2MmS")';
const BLACK = "B";
const WHITE = "W";

/* 先手は黒 */
const startTurn = BLACK;

/* C: 石がない, B: 黒石, W: 白石、Z: 壁 */
const startField = [
    ["Z", "Z", "Z", "Z", "Z", "Z", "Z", "Z", "Z", "Z"],
    ["Z", "C", "C", "C", "C", "C", "C", "C", "C", "Z"],
    ["Z", "C", "C", "C", "C", "C", "C", "C", "C", "Z"],
    ["Z", "C", "C", "C", "C", "C", "C", "C", "C", "Z"],
    ["Z", "C", "C", "C", "W", "B", "C", "C", "C", "Z"],
    ["Z", "C", "C", "C", "B", "W", "C", "C", "C", "Z"],
    ["Z", "C", "C", "C", "C", "C", "C", "C", "C", "Z"],
    ["Z", "C", "C", "C", "C", "C", "C", "C", "C", "Z"],
    ["Z", "C", "C", "C", "C", "C", "C", "C", "C", "Z"],
    ["Z", "Z", "Z", "Z", "Z", "Z", "Z", "Z", "Z", "Z"]
];

/*
処理概要
 盤面を初期状態にし、石数もリセット、メッセージに「黒の番です」と表示する処理

引数
 なし

戻り値
 なし
———————————–*/
function btn1_Click() {
    let range;

    /* 盤面全体をクリアする */
    range = sh.getRange("G7:N14");
    range.clearContent();

    /* スクリプトプロパティ上の盤面データを初期化する */
    prop.setProperty("FIELD", FildToString(startField));

    /* スクリプトプロパティ上のターンを初期化する */
    prop.setProperty("TURN", startTurn);

    /* 盤面全体を初期状態にする */
    sh.getRange("K10").setValue(STONE_BLACK);/* 右上の黒石 */
    sh.getRange("J11").setValue(STONE_BLACK);/* 左下の黒石 */
    sh.getRange("J10").setValue(STONE_WHITE);/* 左上の白石 */
    sh.getRange("K11").setValue(STONE_WHITE);/* 右下の白石 */

    /* メッセージを入力する */
    Browser.msgBox("対戦を開始します。先攻は黒です");
    setFont("V13", "黒の番です", "white", "black");/* メッセージを入力する */

    /* 石の数を画面に反映させる */
    countStone(startField);
}


/*
処理概要
 パスして、相手のターンにする

引数
 なし

戻り値
 なし
———————————–*/
function btn2_Click() {
    let turn

    /* スクリプトプロパティのターンを取得する */
    turn = prop.getProperty("TURN");

    if (turn == BLACK) {
        prop.setProperty("TURN", WHITE);
        Browser.msgBox("パスします。白の番です");
        setFont("V13", "白の番です", "black", "white");/* メッセージを入力する */
    } else {
        prop.setProperty("TURN", BLACK);
        Browser.msgBox("パスします。黒の番です");
        setFont("V13", "黒の番です", "white", "black");/* メッセージを入力する */
    }
}

/*
処理概要
 石が置かれたら発火する処理

引数
 e イベントオブジェクト

戻り値
 なし
———————————–*/
function onEdit(e) {
    let turn, x, y, check, cnt_BLACK, cnt_WHITE;

    /* スクリプトプロパティ上のターンを取得する */
    turn = prop.getProperty("TURN");

    /* 石を置いた場所を取得 */
    y = e.range.getRow();
    x = e.range.getColumn();

    /* 盤面内の場合 */
    if (6 < y < 15 && 6 < x < 15) {

        /* 石を置けるか判定する */
        check = playable(y - 6, x - 6, turn);

        if (check) {
            turn = (turn == BLACK) ? WHITE : BLACK;
            if (turn == BLACK) {
                setFont("V13", "黒の番です", "white", "black");/* メッセージを入力する */
            } else {
                setFont("V13", "白の番です", "black", "white");/* メッセージを入力する */
            }
            prop.setProperty("TURN", turn);
        } else {
            setFont("V13", "エラーです", "red", "white");/* メッセージを入力する */
            sh.getRange(y, x).clearContent();
        }
    }

    /* 石の数を取得する */
    cnt_BLACK = sh.getRange("X7").getValue();
    cnt_WHITE = sh.getRange("X8").getValue();

    /* ゲーム終了か判定する */
    if ((cnt_BLACK + cnt_WHITE) == 64) {
        if (cnt_BLACK < cnt_WHITE) {
            Browser.msgBox("白の勝ちです");
        } else {
            Browser.msgBox("黒の勝ちです");
        }
    }
}

/*
処理概要
 自分の石が置けるか判定し、盤面を更新する

引数
 y 石を置いたy位置
 x 石を置いたx位置
 player B(BLACK)/W(WHITE)

戻り値
 ans True/Falseを返す
———————————–*/
function playable(y, x, player) {
    let field, ans, opponent, delta_y, delta_x, pos, count, n, m

    /* スクリプトプロパティ上の盤面データを取得する */
    field = FildToArray(prop.getProperty("FIELD"));

    ans = false;
    opponent = (player == BLACK) ? WHITE : BLACK;
    delta_y = [-1, -1, 0, 1, 1, 1, 0, -1];
    delta_x = [0, 1, 1, 1, 0, -1, -1, -1];

    /* 選択した箇所に石が置かれていない場合のみ処理する */
    if (field[y][x] == "C") {

        /* 選択した箇所の周囲8箇所に石が置けるかどうか判別する */
        for (pos = 0; pos < 8; pos++) {
            count = 0;
            n = y + delta_y[pos];
            m = x + delta_x[pos];

            /* 周囲8箇所が壁、自分の石、空白の場合、以降の処理を行わない */
            if (field[n][m] == "Z" || field[n][m] == player || field[n][m] == "C") {
                continue;
            }

            /* 周囲8箇所の延長線上に相手の石がある間繰り返す */
            while (field[n][m] == opponent) {
                n += delta_y[pos];
                m += delta_x[pos];
                count++;

                /* 相手の石を挟んで自分の石がある場合、間の相手の石をひっくり返す */
                if (field[n][m] == player) {
                    ans = true;  /* 石が置けた */
                    while (count >= 0) {
                        n -= delta_y[pos];
                        m -= delta_x[pos];
                        /* 石をひっくり返す */
                        changeStone(n, m, player);
                        field[n].splice(m, 1, player);
                        count--;
                    }
                    /* 盤面データを更新し、石を数える */
                    prop.setProperty("FIELD", FildToString(field));
                    countStone(field)
                }
            }
        }
    }
    return ans;
}


/*
処理概要
 文字色、背景色を指定し、指定セルに文字を入力する

引数
 cell セルの位置
 value 入力する値
 fontColor 文字色
 background 背景色

戻り値
 なし
———————————–*/
function setFont(cell, value, fontColor, background) {
    sh.getRange(cell).setValue(value);/* メッセージを入力する */
    sh.getRange(cell).setFontColor(fontColor);
    sh.getRange(cell).setBackground(background);
}

/*
処理概要
 盤面データを文字列に変換する

引数
 array 変換対象の2次元配列

戻り値
 string 変換した文字列を返す
———————————–*/
function FildToString(array) {
    let string;
    string = array.join(",");
    return string;
}

/*
処理概要
 盤面データを2次元配列に変換する

引数
 string 変換対象の文字列

戻り値
 array 変換した2次元配列
———————————–*/
function FildToArray(string) {
    string = prop.getProperty("FIELD");

    /*
    参考情報
    ブログ:Javaエンジニア、React+Redux+Firebaseでアプリを作る
    記事:JavaScriptでn個ずつ配列を分割する
    http://yucatio.hatenablog.com/entry/201"Z"/12/10/222311
    ———————————–*/
    const sliceByNumber = (array, number) => {
        const length = Math.ceil(array.length / number)
        return new Array(length).fill().map((_, i) =>
            array.slice(i * number, (i + 1) * number)
        )
    }
    return sliceByNumber(string.split(","), 10);
}

/*
処理概要
 指定座標を指定石でひっくり返す

引数
 y 石を置いたy位置
 x 石を置いたx位置
 player B(BLACK)/W(WHITE)

戻り値
 なし
———————————–*/
function changeStone(y, x, player) {
    if (player == BLACK) {
        sh.getRange(y + 6, x + 6).setValue(STONE_BLACK);
    } else {
        sh.getRange(y + 6, x + 6).setValue(STONE_WHITE);
    }
}


/*
処理概要
 石の数を画面に反映する

引数
 filed 盤面データ

戻り値
 なし
———————————–*/
function countStone(field) {
    let cnt_BLACK, cnt_WHITE;

    cnt_BLACK = 0;
    cnt_WHITE = 0;

    for (let i in field) {
        for (let j in field[i]) {
            if (field[i][j] == BLACK) {
                cnt_BLACK++;
            }
            if (field[i][j] == WHITE) {
                cnt_WHITE++;
            }
        }
    }
    sh.getRange("X7").setValue(cnt_BLACK);
    sh.getRange("X8").setValue(cnt_WHITE);
}
