if (
  process.env.NODE_ENV !== 'production' && process.loadEnvFile
) {
  process.loadEnvFile(".env");
}

describe('Valid required configs', () => {
  test('should have some env variables', () => {
    const { BOT_TOKEN, COOKIES } = process.env;

    expect(BOT_TOKEN).toBeDefined();
    expect(COOKIES).toBeDefined();
  })

  test('should have a valid BOT_TOKEN', () => {
    const { BOT_TOKEN } = process.env;

    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`)
      .then(res => res.json())
      .then(data => {
        expect(data.ok).toBe(true);
      });
  })
})
