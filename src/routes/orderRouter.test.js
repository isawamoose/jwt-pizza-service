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
let testUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
});

test('add item to and get menu', async () => {
  const menu = (await request(app).get('/api/order/menu')).body;
  const adminUser = await createAdminUser();
  const adminUserAuthToken = (await request(app).put('/api/auth').send(adminUser)).body.token;
  const addMenuItemRes = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${adminUserAuthToken}`)
    .send({ title: 'Test', description: 'Test', image: 'pizza9.png', price: 0.0001 });

  expect(addMenuItemRes.status).toBe(200);

  const newMenu = addMenuItemRes.body;
  expect(newMenu.length).toBe(menu.length + 1);

  const lastItem = newMenu[newMenu.length - 1];
  expect(lastItem.title).toBe('Test');
  expect(lastItem.description).toBe('Test');
});

test('create and get order', async () => {
  const order = { franchiseId: 1, storeId: 1, items: [{ menuId: 1, description: 'Veggie', price: 0.05 }] };
  const createOrderRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send(order);

  expect(createOrderRes.status).toBe(200);
  expect(createOrderRes.body.order.items[0].description).toBe('Veggie');

  const getOrdersRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(getOrdersRes.status).toBe(200);
  expect(getOrdersRes.body.orders.length).toBe(1);
  expect(getOrdersRes.body.orders[0].items[0].description).toBe('Veggie');
});
