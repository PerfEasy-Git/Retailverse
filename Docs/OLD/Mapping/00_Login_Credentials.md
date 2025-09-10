# Login Credentials for RetailVerse Data Import

## Brand User Credentials

The following credentials are generated for brand users based on the PRODUCT_INFO sheet:

| Brand Name | Email | Password | User ID | Brand ID |
|------------|-------|----------|---------|----------|
| AXE | axe@retailverse.com | AXE@2024! | 15 | 12 |
| GILLETTE | gillette@retailverse.com | GILLETTE@2024! | 16 | 13 |
| BOMBAY SHAVING | bombayshaving@retailverse.com | BOMBAYSHAVING@2024! | 17 | 14 |
| PARK AVENUE | parkavenue@retailverse.com | PARKAVENUE@2024! | 18 | 15 |
| DENIM | denim@retailverse.com | DENIM@2024! | 19 | 16 |
| FAIR & LOVELY | fairlovely@retailverse.com | FAIRLOVELY@2024! | 20 | 17 |
| LUX | lux@retailverse.com | LUX@2024! | 21 | 18 |
| DOVE | dove@retailverse.com | DOVE@2024! | 22 | 19 |
| POND'S | ponds@retailverse.com | PONDS@2024! | 23 | 20 |
| LAKME | lakme@retailverse.com | LAKME@2024! | 24 | 21 |

## Retailer User Credentials

The following credentials are generated for retailer users based on the RETAILER_INFO sheet:

| Retailer Name | Email | Password | User ID | Retailer ID |
|---------------|-------|----------|---------|-------------|
| Reliance Retail | retailer_rt0001@retailverse.com | password | 25 | 6 |
| Future Group | retailer_rt0002@retailverse.com | password | 26 | 7 |
| D-Mart | retailer_rt0003@retailverse.com | password | 27 | 8 |
| Big Bazaar | retailer_rt0004@retailverse.com | password | 28 | 9 |
| Spencer's Retail | retailer_rt0005@retailverse.com | password | 29 | 10 |
| More Retail | retailer_rt0006@retailverse.com | password | 30 | 11 |
| V-Mart | retailer_rt0007@retailverse.com | password | 31 | 12 |
| Trent | retailer_rt0008@retailverse.com | password | 32 | 13 |
| Shoppers Stop | retailer_rt0009@retailverse.com | password | 33 | 14 |
| Lifestyle | retailer_rt0010@retailverse.com | password | 34 | 15 |
| Pantaloons | retailer_rt0011@retailverse.com | password | 35 | 16 |
| Central | retailer_rt0012@retailverse.com | password | 36 | 17 |
| Westside | retailer_rt0013@retailverse.com | password | 37 | 18 |
| Max Fashion | retailer_rt0014@retailverse.com | password | 38 | 19 |
| Brand Factory | retailer_rt0015@retailverse.com | password | 39 | 20 |
| Reliance Digital | retailer_rt0016@retailverse.com | password | 40 | 21 |
| Croma | retailer_rt0017@retailverse.com | password | 41 | 22 |
| Vijay Sales | retailer_rt0018@retailverse.com | password | 42 | 23 |
| Reliance Trends | retailer_rt0019@retailverse.com | password | 43 | 24 |
| Reliance Footprint | retailer_rt0020@retailverse.com | password | 44 | 25 |
| Reliance Jewels | retailer_rt0021@retailverse.com | password | 45 | 26 |
| Reliance Smart | retailer_rt0022@retailverse.com | password | 46 | 27 |
| Reliance Fresh | retailer_rt0023@retailverse.com | password | 47 | 28 |
| Reliance Market | retailer_rt0024@retailverse.com | password | 48 | 29 |
| Reliance Super | retailer_rt0025@retailverse.com | password | 49 | 30 |
| Reliance Express | retailer_rt0026@retailverse.com | password | 50 | 31 |
| Reliance Mini | retailer_rt0027@retailverse.com | password | 51 | 32 |
| Reliance Local | retailer_rt0028@retailverse.com | password | 52 | 33 |
| Reliance Connect | retailer_rt0029@retailverse.com | password | 53 | 34 |
| Reliance Mobile | retailer_rt0030@retailverse.com | password | 54 | 35 |
| Reliance Jio | retailer_rt0031@retailverse.com | password | 55 | 36 |
| Reliance Broadband | retailer_rt0032@retailverse.com | password | 56 | 37 |
| Reliance Energy | retailer_rt0033@retailverse.com | password | 57 | 38 |
| Reliance Gas | retailer_rt0034@retailverse.com | password | 58 | 39 |
| Reliance Petro | retailer_rt0035@retailverse.com | password | 59 | 40 |
| Reliance Life | retailer_rt0036@retailverse.com | password | 60 | 41 |
| Reliance Health | retailer_rt0037@retailverse.com | password | 61 | 42 |
| Reliance Insurance | retailer_rt0038@retailverse.com | password | 62 | 43 |
| Reliance Securities | retailer_rt0039@retailverse.com | password | 63 | 44 |

## SQL Import Order

Execute the SQL files in the following order:

1. `01_Brand_Users.sql` - Create brand user accounts
2. `02_Retailer_Users.sql` - Create retailer user accounts  
3. `03_Brands.sql` - Create brand records linked to users
4. `04_Retailers.sql` - Create retailer records linked to users
5. `05_Products.sql` - Create product records linked to brands
6. `06_Retailer_Locations.sql` - Create retailer location records
7. `07_Retailer_Product_Mappings.sql` - Create retailer-product relationships

## Notes

- All passwords are hashed using bcrypt with the hash: `$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`
- This hash corresponds to the word "password"
- User IDs start from 15 for brands and 25 for retailers to avoid conflicts with existing data
- Brand IDs start from 12 and Retailer IDs start from 6 to avoid conflicts with existing data
- All data is extracted directly from the Excel file without any modifications
- The retailer-product mappings file contains a sample of the first retailer's mappings. The complete file would contain all 723 mappings from the Excel file.
