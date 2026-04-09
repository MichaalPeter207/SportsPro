import pandas as pd
import numpy as np

def load_sample_data():
    np.random.seed(42)
    n_per_class = 1000  # 1000 samples per outcome = 3000 total, balanced

    def make_samples(result_label, home_bias, away_bias, n):
        home_strength = np.random.beta(home_bias[0], home_bias[1], n)
        away_strength = np.random.beta(away_bias[0], away_bias[1], n)

        home_form      = np.clip(home_strength + np.random.normal(0, 0.07, n), 0, 1)
        away_form      = np.clip(away_strength + np.random.normal(0, 0.07, n), 0, 1)
        home_goal_diff = home_strength * 4 - 1.5 + np.random.normal(0, 0.4, n)
        away_goal_diff = away_strength * 4 - 2.0 + np.random.normal(0, 0.4, n)
        home_rating    = np.clip(home_strength * 4 + 5.5 + np.random.normal(0, 0.3, n), 4, 10)
        away_rating    = np.clip(away_strength * 4 + 5.0 + np.random.normal(0, 0.3, n), 4, 10)

        return pd.DataFrame({
            'home_form':      home_form,
            'home_goal_diff': home_goal_diff,
            'home_rating':    home_rating,
            'away_form':      away_form,
            'away_goal_diff': away_goal_diff,
            'away_rating':    away_rating,
            'home_advantage': np.ones(n),
            'result':         np.full(n, result_label)
        })

    # Home win: home team clearly stronger
    df_home = make_samples(2, home_bias=(7, 3), away_bias=(3, 7), n=n_per_class)

    # Away win: away team clearly stronger
    df_away = make_samples(0, home_bias=(3, 7), away_bias=(7, 3), n=n_per_class)

    # Draw: evenly matched teams
    df_draw = make_samples(1, home_bias=(5, 5), away_bias=(5, 5), n=n_per_class)

    df = pd.concat([df_home, df_away, df_draw], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)  # Shuffle
    return df


def preprocess(df):
    df = df.dropna()
    df['home_form']      = df['home_form'].clip(0, 1)
    df['away_form']      = df['away_form'].clip(0, 1)
    df['home_goal_diff'] = df['home_goal_diff'].clip(-5, 5)
    df['away_goal_diff'] = df['away_goal_diff'].clip(-5, 5)
    df['home_rating']    = df['home_rating'].clip(1, 10)
    df['away_rating']    = df['away_rating'].clip(1, 10)

    df['form_diff']   = df['home_form'] - df['away_form']
    df['rating_diff'] = df['home_rating'] - df['away_rating']
    df['goal_diff']   = df['home_goal_diff'] - df['away_goal_diff']

    feature_columns = [
        'home_form', 'home_goal_diff', 'home_rating',
        'away_form', 'away_goal_diff', 'away_rating',
        'home_advantage', 'form_diff', 'rating_diff', 'goal_diff',
    ]

    X = df[feature_columns]
    y = df['result']

    print(f"Dataset shape: {X.shape}")
    print(f"Result distribution:\n{y.value_counts().rename({0:'Away Win', 1:'Draw', 2:'Home Win'})}")
    return X, y


if __name__ == '__main__':
    df = load_sample_data()
    X, y = preprocess(df)
    print("\nPreprocessing complete!")