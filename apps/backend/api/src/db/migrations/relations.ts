import { relations } from "drizzle-orm/relations";
import { drivers, driverCategories, driverTypologies } from "./schema";

export const driverCategoriesRelations = relations(driverCategories, ({one, many}) => ({
	driver: one(drivers, {
		fields: [driverCategories.driverId],
		references: [drivers.id]
	}),
	driverTypologies: many(driverTypologies),
}));

export const driversRelations = relations(drivers, ({many}) => ({
	driverCategories: many(driverCategories),
}));

export const driverTypologiesRelations = relations(driverTypologies, ({one}) => ({
	driverCategory: one(driverCategories, {
		fields: [driverTypologies.categoryId],
		references: [driverCategories.id]
	}),
}));