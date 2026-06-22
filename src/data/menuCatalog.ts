export interface MenuItem {
  number: string
  nameBn: string
  nameEn: string
  price: number
  isHouseFavourite?: boolean
}

export interface MenuCategory {
  id: string
  titleBn: string
  titleEn: string
  subtitle: string
  items: MenuItem[]
}

export const menuCategories: MenuCategory[] = [
  {
    id: 'main-courses',
    titleBn: 'প্রধান খাবার',
    titleEn: 'Main Courses',
    subtitle: 'Hearty meals from our kitchen',
    items: [
      { number: '01', nameBn: 'ভাত', nameEn: 'Steamed Rice', price: 40 },
      { number: '02', nameBn: 'দেশি মুরগি', nameEn: 'Local Chicken', price: 300, isHouseFavourite: true },
      { number: '03', nameBn: 'ব্রয়লার মুরগি', nameEn: 'Broiler Chicken', price: 200 },
      { number: '04', nameBn: 'চিকেন ফ্রাই', nameEn: 'Chicken Fry', price: 200 },
      { number: '05', nameBn: 'নদীর মাছ', nameEn: 'River Fish', price: 300, isHouseFavourite: true },
      { number: '06', nameBn: 'পুকুরের মাছ', nameEn: 'Farm / Regular Fish', price: 250 },
      { number: '07', nameBn: 'গরুর মাংস', nameEn: 'Beef Curry', price: 350, isHouseFavourite: true },
      { number: '08', nameBn: 'খাসির মাংস', nameEn: 'Mutton Curry', price: 350 },
      { number: '09', nameBn: 'বলচাও (শুঁটকি)', nameEn: 'Balachao — Dry Fish', price: 200 },
      { number: '10', nameBn: 'ডাল', nameEn: 'Lentil Dal', price: 60 },
      { number: '11', nameBn: 'শাকসবজি', nameEn: 'Mixed Vegetables', price: 100 },
      { number: '12', nameBn: 'ভর্তা', nameEn: 'Bhorta (Mixed)', price: 90 },
      { number: '13', nameBn: 'আলু ভর্তা', nameEn: 'Mashed Potato Bhorta', price: 50 },
      { number: '14', nameBn: 'ডিম ভর্তা', nameEn: 'Egg Bhorta', price: 60 },
      { number: '15', nameBn: 'ডিম', nameEn: 'Egg (any style)', price: 60 },
      { number: '16', nameBn: 'সালাদ', nameEn: 'Fresh Salad', price: 100 },
    ],
  },
  {
    id: 'snacks',
    titleBn: 'স্ন্যাকস ও ফাস্ট ফুড',
    titleEn: 'Snacks & Fast Food',
    subtitle: 'International bites & light meals',
    items: [
      { number: '17', nameBn: 'ফ্রেঞ্চ ফ্রাই', nameEn: 'French Fries', price: 150 },
      { number: '18', nameBn: 'নাচোস', nameEn: 'Nachos', price: 300, isHouseFavourite: true },
      { number: '19', nameBn: 'চাউমিন', nameEn: 'Chow Mein Noodles', price: 250 },
      { number: '20', nameBn: 'পাস্তা', nameEn: 'Pasta — Red Sauce', price: 250 },
      { number: '21', nameBn: 'হোয়াইট সস পাস্তা', nameEn: 'White Sauce Pasta', price: 300, isHouseFavourite: true },
      { number: '22', nameBn: 'স্যুপ', nameEn: 'Soup', price: 120 },
      { number: '23', nameBn: 'কফি', nameEn: 'Coffee', price: 80 },
    ],
  },
  {
    id: 'breakfast',
    titleBn: 'সকালের নাস্তা',
    titleEn: 'Breakfast',
    subtitle: 'Served fresh every morning',
    items: [
      { number: '24', nameBn: 'পরোটা', nameEn: 'Paratha', price: 30 },
      { number: '25', nameBn: 'ডিম', nameEn: 'Egg — Omelette / Poached / Boiled', price: 40 },
      { number: '26', nameBn: 'সবজি ভাজি', nameEn: 'Vegetable Fry', price: 50 },
      { number: '27', nameBn: 'চা', nameEn: 'Tea', price: 50 },
    ],
  },
  {
    id: 'beverages',
    titleBn: 'জুস ও পানীয়',
    titleEn: 'Juices & Beverages',
    subtitle: 'Freshly blended',
    items: [
      { number: '28', nameBn: 'পেঁপে জুস', nameEn: 'Papaya Juice', price: 100, isHouseFavourite: true },
      { number: '29', nameBn: 'লেবুর শরবত', nameEn: 'Lemon Juice', price: 60 },
      { number: '30', nameBn: 'তরমুজের জুস', nameEn: 'Watermelon Juice', price: 120 },
      { number: '31', nameBn: 'গাজরের জুস', nameEn: 'Carrot Juice', price: 120 },
      { number: '32', nameBn: 'কদবেল জুস', nameEn: 'Wood Apple Juice', price: 120 },
      { number: '33', nameBn: 'আমের জুস', nameEn: 'Mango Juice', price: 120, isHouseFavourite: true },
      { number: '34', nameBn: 'আপেল জুস', nameEn: 'Apple Juice', price: 120 },
    ],
  },
]

export const formatMenuPrice = (price: number): string =>
  `৳ ${price.toLocaleString('en-BD')}`
