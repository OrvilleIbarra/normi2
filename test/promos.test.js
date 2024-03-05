const mongoose = require('mongoose');
const { promoCalculate } = require('../controllers/promo.controller');

// Mock mongoose ObjectId validation to always return true
jest.mock('mongoose', () => ({
  ...jest.requireActual('mongoose'),
  Types: {
    ...jest.requireActual('mongoose').Types,
    ObjectId: {
      ...jest.requireActual('mongoose').Types.ObjectId,
      isValid: jest.fn().mockReturnValue(true)
    }
  }
}));

// Mock OrderModel.findById for specific orders
jest.mock('../models/order.model', () => ({
  OrderModel: {
    findById: jest.fn((orderId) => ({
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockImplementation(() => {
        const orders = {
          'order1': {
            _id: 'order1',
            dishes: [
              { dishName: "Plato A", dishDescription: "Desc A", dishImgSrc: "ImgSrc A", price: 50, type: "Plato" },
              { dishName: "Plato A", dishDescription: "Desc A", dishImgSrc: "ImgSrc A", price: 50, type: "Plato" },
              { dishName: "Plato A", dishDescription: "Desc A", dishImgSrc: "ImgSrc A", price: 50, type: "Plato" },
            ],
            total: 150,
            save: async function() { return this; },
          },
          'order2': {
            _id: 'order2',
            dishes: [
              { dishName: "Bebida A", dishDescription: "Desc A", dishImgSrc: "ImgSrc A", price: 10, type: "Refresco" },
              { dishName: "Bebida A", dishDescription: "Desc A", dishImgSrc: "ImgSrc A", price: 10, type: "Refresco" },
            ],
            total: 20,
            save: async function() { return this; },
          },
          'order3': {
            _id: 'order3',
            dishes: [
              { dishName: "Plato A", dishDescription: "Desc A", dishImgSrc: "ImgSrc A", price: 60, type: "Plato" },
              { dishName: "Plato ", dishDescription: "Desc B", dishImgSrc: "ImgSrc B", price: 60, type: "Plato" },
              { dishName: "Plato C", dishDescription: "Desc B", dishImgSrc: "ImgSrc B", price: 60, type: "Plato" },
              { dishName: "Refresco A", dishDescription: "Desc A", dishImgSrc: "ImgSrc A", price: 10, type: "Refresco" },
              { dishName: "Refresco B", dishDescription: "Desc B", dishImgSrc: "ImgSrc B", price: 10, type: "Refresco" }
            ],
            total: 0,
            save: async function() { return this; },
          },
          'order4': {
            _id: 'order4',
            dishes: [
              { dishName: "Plato C", dishDescription: "Desc C", dishImgSrc: "ImgSrc C", price: 100, type: "Plato" },
              { dishName: "Refresco C", dishDescription: "Desc C", dishImgSrc: "ImgSrc C", price: 30, type: "Refresco" },
              { dishName: "Refresco D", dishDescription: "Desc D", dishImgSrc: "ImgSrc D", price: 20, type: "Refresco" }
            ],
            total: 150,
            save: async function() { return this; },
          }
        };
        
        return Promise.resolve(orders[orderId]);
      }),
    })),
  },
}));

describe('Promo Calculate Functionality', () => {
  test('Given there are 3 identical dishes in the order (order1), it should only add the cost of two of them to the total and the discount should not be more than 20 pesos', async () => {
    const result = await promoCalculate('order1', null);
    expect(result.total).toEqual(100); // Expected total considering the discount for identical dishes
    expect(result.totalDiscount).toBeLessThanOrEqual(20); // The discount should be 50 or the logic of your promo
  });

  test('Given there are two identical drinks in the order (order2), it should only add the cost of one of them to the total and the discount should not be more than 10 pesos', async () => {
    const result = await promoCalculate('order2', null);
    expect(result.total).toEqual(10); // Expected total considering the discount for identical drinks
    expect(result.totalDiscount).toBeLessThanOrEqual(10); // The discount should be 10 or the logic of your promo
  });

  test('It should only apply the promotion that offers the most savings to the user (order3)', async () => {
    const result = await promoCalculate('order3', null);
    
    // Here, you'll need to calculate what the expected total and total discount should be
    // based on the most beneficial promotion available for 'order3'
    const expectedTotal = 130; // Example expected total after the best discount is applied
    const expectedTotalDiscount = 15; // Example expected discount
    
    expect(result.total).toEqual(expectedTotal);
    expect(result.totalDiscount).toEqual(expectedTotalDiscount);
  });

  test.each([
    ['BIENVENIDA', 150 * 0.7, 'Should subtract 30% of the order if the code is "BIENVENIDA"'],
    ['REFRESCATE', 150 - 30, 'Should subtract the price of the most expensive drink if the code is "REFRESCATE"'],
    ['COMBO', 150 - (100 + 20), 'Should subtract the price of the cheapest dish and drink if the code is "COMBO"'],
    ['PAREJA', 150 - (100 + 30), 'Should subtract the price of the two most expensive items if the code is "PAREJA"'],
  ])('%s', async (promoCode, expectedTotal, description) => {
    const result = await promoCalculate('order4', promoCode);
    expect(result.total).toBeCloseTo(expectedTotal, description);
  });
});
