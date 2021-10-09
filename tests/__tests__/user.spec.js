import frisby from 'frisby';

const { Joi } = frisby;

const userSchema = Joi.object({
  id: Joi.number(),
  name: Joi.string(),
  email: Joi.string(),
});

const BASE_URL = 'http://localhost:8080';

frisby.baseUrl(BASE_URL);

describe('Users', () => {
  let count = 0;

  function generateUserData() {
    count += 1;
    return {
      email: `${new Date().getTime()}-${count}@test.com`,
      name: 'testuser',
      password: 'password',
    };
  }

  async function createUser(userData) {
    const { json } = await frisby.post('/users', userData);
    const { id } = json;
    return { id };
  }

  async function loginUser(userData) {
    const { json } = await frisby.post('/session', {
      email: userData.email,
      password: userData.password,
    });
    const { accessToken } = json;
    return { accessToken };
  }

  async function setupUser() {
    const userData = generateUserData();
    const { id } = await createUser(userData);
    const { accessToken } = await loginUser(userData);
    return { id, accessToken };
  }

  function setupAccessToken(accessToken) {
    frisby.globalSetup({
      request: {
        baseUrl: BASE_URL,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }

  describe('POST /users', () => {
    let userData = {};

    beforeEach(() => {
      userData = generateUserData();
    });

    context('with correct data', () => {
      it('responds with user', async () => {
        await frisby.post('/users', userData)
          .expect('status', 201)
          .expect('jsonTypes', userSchema);
      });
    });

    context('without required parameter', () => {
      it('responds 400 error', async () => {
        await Promise.all((
          ['name', 'email', 'password'].map(async (key) => {
            const data = { ...userData, [key]: '' };
            await frisby.post('/users', data)
              .expect('status', 400);
          })
        ));
      });
    });
  });

  describe('PATCH /users/{id}', () => {
    const newUserData = {
      name: 'updated name',
      password: '12345678',
    };

    let userId;

    beforeEach(async () => {
      const { id, accessToken } = await setupUser();
      setupAccessToken(accessToken);

      userId = id;
    });

    context('with existing user', () => {
      it('responds with updated user', async () => {
        const { json } = await frisby.patch(`/users/${userId}`, newUserData)
          .expect('status', 200);

        expect(json.name).toBe(newUserData.name);
      });
    });

    context('with others', () => {
      beforeEach(() => {
        userId = 9999;
      });

      it('responds Forbidden', async () => {
        await frisby.patch(`/users/${userId}`, newUserData)
          .expect('status', 403);
      });
    });

    context('with wrong parameter', () => {
      it('responds Bad Request', async () => {
        await Promise.all((
          ['name', 'password'].map(async (key) => {
            const data = { ...newUserData, [key]: '' };
            await frisby.patch(`/users/${userId}`, data)
              .expect('status', 400);
          })
        ));
      });
    });
  });

  describe('DELETE /users/{id}', () => {
    let userId;

    beforeEach(async () => {
      const { id, accessToken } = await setupUser();
      setupAccessToken(accessToken);

      userId = id;
    });

    context('with existing user', () => {
      it('responds No Content', async () => {
        await frisby.del(`/users/${userId}`)
          .expect('status', 204);
      });
    });

    context('with not existing user', () => {
      beforeEach(() => {
        userId = 9999;
      });

      it('responds not found', async () => {
        await frisby.del(`/users/${userId}`)
          .expect('status', 404);
      });
    });
  });
});
