const { DB, Role } = require('../database/database.js');
const request = require('supertest');
const app = require('../service');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test('create and delete a franchise', async () => {
  // create a new franchise
  const adminUser = await createAdminUser();
  const adminUserAuthToken = (await request(app).put('/api/auth').send(adminUser)).body.token;
  const franchises = (await request(app).get('/api/franchise')).body;
  const createFranchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminUserAuthToken}`)
    .send({ name: 'test franchise', admins: [{ email: adminUser.email }] });
  const newFranchise = createFranchiseRes.body;
  expect(newFranchise.name).toBe('test franchise');
  expect(newFranchise.admins[0].email).toBe(adminUser.email);
  const newFranchises = (await request(app).get('/api/franchise')).body;
  expect(newFranchises.length).toBe(franchises.length + 1);

  // delete the franchise
  const deleteFranchiseRes = await request(app)
    .delete('/api/franchise/' + newFranchise.id)
    .set('Authorization', `Bearer ${adminUserAuthToken}`);
  expect(deleteFranchiseRes.status).toBe(200);
  expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
  const franchisesAfterDeletion = (await request(app).get('/api/franchise')).body;
  expect(franchisesAfterDeletion.length).toBe(franchises.length);
});

test('create and delete a store', async () => {
  //   create a new franchise
  const adminUser = await createAdminUser();
  const adminUserAuthToken = (await request(app).put('/api/auth').send(adminUser)).body.token;
  const createFranchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminUserAuthToken}`)
    .send({ name: 'test franchise', admins: [{ email: adminUser.email }] });
  const newFranchise = createFranchiseRes.body;
  expect(newFranchise.name).toBe('test franchise');

  //   get the admin user's franchises and get the stores for the new franchise
  let userFranchises = (
    await request(app)
      .get('/api/franchise/' + adminUser.id)
      .set('Authorization', `Bearer ${adminUserAuthToken}`)
  ).body;
  expect(userFranchises.length).toBe(1);
  expect(userFranchises[0].name).toBe('test franchise');
  expect(userFranchises[0].stores.length).toBe(0);

  //   create a new store
  const createStoreRes = await request(app)
    .post('/api/franchise/' + newFranchise.id + '/store')
    .set('Authorization', `Bearer ${adminUserAuthToken}`)
    .send({ franchiseId: newFranchise.id, name: 'test store' });
  const newStore = createStoreRes.body;
  expect(newStore.name).toBe('test store');

  //   get the admin user's stores again
  userFranchises = (
    await request(app)
      .get('/api/franchise/' + adminUser.id)
      .set('Authorization', `Bearer ${adminUserAuthToken}`)
  ).body;
  expect(userFranchises[0].stores.length).toBe(1);

  //   delete the store
  const deleteStoreRes = await request(app)
    .delete('/api/franchise/' + newFranchise.id + '/store/' + newStore.id)
    .set('Authorization', `Bearer ${adminUserAuthToken}`);
  expect(deleteStoreRes.status).toBe(200);
  expect(deleteStoreRes.body.message).toBe('store deleted');

  //   get the admin user's stores again
  userFranchises = (
    await request(app)
      .get('/api/franchise/' + adminUser.id)
      .set('Authorization', `Bearer ${adminUserAuthToken}`)
  ).body;
  expect(userFranchises[0].stores.length).toBe(0);

  //   delete the franchise
  const deleteFranchiseRes = await request(app)
    .delete('/api/franchise/' + newFranchise.id)
    .set('Authorization', `Bearer ${adminUserAuthToken}`);
  expect(deleteFranchiseRes.status).toBe(200);
  expect(deleteFranchiseRes.body.message).toBe('franchise deleted');
});

test('rejects non admin users for franchise and store creation', async () => {
  // attempt to create a franchise
  const createFranchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send({ name: 'test franchise', admins: [{ email: testUser.email }] });
  expect(createFranchiseRes.status).toBe(403);
  expect(createFranchiseRes.body.message).toBe('unable to create a franchise');
});
