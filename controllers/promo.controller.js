const mongoose = require('mongoose');
const { DishModel } = require('../models/dishes.model'); 
const { OrderModel } = require('../models/order.model'); 
 
async function promoCalculate(orderId, promoCode) {
    try {
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            throw new Error('Invalid orderId format');
        }

        const order = await OrderModel.findById(orderId).populate('dishes').exec();
        if (!order) {
            throw new Error('Order not found');
        }

        let hasPromoApplied = false;
        let totalDiscount = 0;
        let total = order.dishes.reduce((acc, dish) => acc + dish.price, 0);

        if (!promoCode) {
            let dishCounts = {};
            let sodaCounts = {};

            // Contar platillos y refrescos
            order.dishes.forEach(dish => {
                if (dish.type !== 'Refresco') {
                    dishCounts[dish.dishName] = (dishCounts[dish.dishName] || 0) + 1;
                } else {
                    sodaCounts[dish.dishName] = (sodaCounts[dish.dishName] || 0) + 1;
                }
            });

            // Promoción para platillos
            for (let dishName in dishCounts) {
                if (dishCounts[dishName] >= 3) {
                    let dishPrice = order.dishes.find(d => d.dishName === dishName).price;
                    totalDiscount += Math.min(dishPrice, 20) * Math.floor(dishCounts[dishName] / 3);
                }
            }

            // Promoción para refrescos
            for (let dishName in sodaCounts) {
                if (sodaCounts[dishName] >= 2) {
                    let sodaPrice = order.dishes.find(d => d.dishName === dishName && d.type === 'Refresco').price;
                    totalDiscount += Math.min(sodaPrice, 10) * Math.floor(sodaCounts[dishName] / 2);
                }
            }
        } else {
            // Aplicar códigos promocionales
            switch (promoCode) {
                case 'BIENVENIDA':
                    totalDiscount = total * 0.3;
                    hasPromoApplied = true;
                    break;
                case 'REFRESCATE':
                    const maxBeveragePrice = Math.max(...order.dishes.filter(d => d.type === 'Refresco').map(d => d.price), 0);
                    totalDiscount = maxBeveragePrice;
                    hasPromoApplied = true;
                    break;
                case 'COMBO':
                    const minDishPrice = Math.min(...order.dishes.filter(d => d.type !== 'Refresco').map(d => d.price));
                    const minBeveragePrice = Math.min(...order.dishes.filter(d => d.type === 'Refresco').map(d => d.price), 0);
                    totalDiscount = minDishPrice + minBeveragePrice;
                    hasPromoApplied = true;
                    break;
                case 'PAREJA':
                    const dishPrices = order.dishes.filter(d => d.type !== 'Refresco').map(d => d.price).sort((a, b) => b - a);
                    const beveragePrices = order.dishes.filter(d => d.type === 'Refresco').map(d => d.price).sort((a, b) => b - a);
                    totalDiscount = (dishPrices[0] || 0) + (dishPrices[1] || 0) + (beveragePrices[0] || 0) + (beveragePrices[1] || 0);
                    hasPromoApplied = true;
                    break;
            }
        }

        total -= totalDiscount;

        // Actualizar el total en el pedido y guardar los cambios
        order.total = total > 0 ? total : 0;
        await order.save();

        return {
            total: order.total,
            totalDiscount,
            promoApplied: hasPromoApplied || totalDiscount > 0
        };

    } catch (error) {
        console.error('Error al calcular promociones:', error);
        throw error;
    }
}

module.exports = {
    promoCalculate
};
