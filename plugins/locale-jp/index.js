/**
 * Japanese Localization Plugin
 *
 * Provides Japanese language support including:
 * - Japanese font families for proper character rendering
 * - Japanese section header recognition (Prerequisites, Course Outline)
 */

export default {
    name: 'locale-jp',
    version: '1.0.0',
    description: 'Japanese localization support',

    hooks: {
        // Japanese-compatible fonts
        fontFamilies: [
            '"Hiragino Sans"',
            '"Hiragino Kaku Gothic Pro"',
            '"Noto Sans CJK JP"',
            '"Yu Gothic"',
            '"Meiryo"',
        ],

        // Japanese section headers
        prerequisiteHeaders: [
            '## 受講前提条件', // Prerequisites in Japanese
        ],

        courseOutlineHeaders: [
            '## コース概要', // Course Outline in Japanese
        ],

        // Japanese UI labels
        labels: {
            format: '形式',
            duration: '時間',
            // duration: '期限',
            audience: '対象者',
        },

        // Built-in value translations for standardized terms
        valueTranslations: {
            // Modality values
            ILT: 'インストラクター主導',
            VILT: 'バーチャル',
            'Instructor-led training w/ labs': 'ラボ付きインストラクター主導',
            'Instructor-led training': 'インストラクター主導',
            'E-learning w/ labs': 'ラボ付きeラーニング',
            'E-learning': 'eラーニング',
            'Self-paced': 'セルフペース',
            // Duration units
            hours: '時間',
            hrs: '時間',
            hr: '時間',
            minutes: '分',
            min: '分',
            days: '日',
        },
    },
};
