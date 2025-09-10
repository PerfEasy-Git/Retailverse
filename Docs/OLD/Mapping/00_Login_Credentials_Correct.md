# Login Credentials for RetailVerse Data Import (CORRECTED)

## Brand User Credentials
| Brand Name | Email | Password | User ID | Brand ID |
|------------|-------|----------|---------|----------|
| AXE | axe@retailverse.com | AXE@2024! | 15 | 12 |
| GILLETTE | gillette@retailverse.com | GILLETTE@2024! | 16 | 13 |
| PARK AVENUE | parkavenue@retailverse.com | PARKAVENUE@2024! | 17 | 14 |
| SET WET | setwet@retailverse.com | SETWET@2024! | 18 | 15 |
| DENIM | denim@retailverse.com | DENIM@2024! | 19 | 16 |
| OLD SPICE | oldspice@retailverse.com | OLDSPICE@2024! | 20 | 17 |
| NIVEA | nivea@retailverse.com | NIVEA@2024! | 21 | 18 |
| FAIR & LOVELY | fairlovely@retailverse.com | FAIRLOVELY@2024! | 22 | 19 |
| POND'S | ponds@retailverse.com | PONDS@2024! | 23 | 20 |
| LAKME | lakme@retailverse.com | LAKME@2024! | 24 | 21 |

## Retailer User Credentials (CORRECTED)
| Retailer Name | Email | Password | User ID | Retailer ID |
|---------------|-------|----------|---------|-------------|
| Apna Chemist | retailer_rt0001@retailverse.com | password | 25 | 6 |
| Apollo | retailer_rt0002@retailverse.com | password | 26 | 7 |
| Balaji Grand | retailer_rt0003@retailverse.com | password | 27 | 8 |
| Bismi | retailer_rt0004@retailverse.com | password | 28 | 9 |
| Centro | retailer_rt0005@retailverse.com | password | 29 | 10 |
| D Mart Ready | retailer_rt0006@retailverse.com | password | 30 | 11 |
| Dabur New U | retailer_rt0007@retailverse.com | password | 31 | 12 |
| DJT | retailer_rt0008@retailverse.com | password | 32 | 13 |
| Fashion Factory | retailer_rt0009@retailverse.com | password | 33 | 14 |
| Gaurdians | retailer_rt0010@retailverse.com | password | 34 | 15 |
| Health & Glow | retailer_rt0011@retailverse.com | password | 35 | 16 |
| Kathiyavaar | retailer_rt0012@retailverse.com | password | 36 | 17 |
| Kolkata Bazaar | retailer_rt0013@retailverse.com | password | 37 | 18 |
| Le Marche | retailer_rt0014@retailverse.com | password | 38 | 19 |
| Lifestyle | retailer_rt0015@retailverse.com | password | 39 | 20 |
| Lulu Hyper | retailer_rt0016@retailverse.com | password | 40 | 21 |
| Max Bazaar | retailer_rt0017@retailverse.com | password | 41 | 22 |
| Metro C&C | retailer_rt0018@retailverse.com | password | 42 | 23 |
| Modern Bazaar | retailer_rt0019@retailverse.com | password | 43 | 24 |
| More | retailer_rt0020@retailverse.com | password | 44 | 25 |
| Nykaa B2B | retailer_rt0021@retailverse.com | password | 45 | 26 |
| Pantaloons | retailer_rt0022@retailverse.com | password | 46 | 27 |
| Planet health | retailer_rt0023@retailverse.com | password | 47 | 28 |
| Potthy's | retailer_rt0024@retailverse.com | password | 48 | 29 |
| Rajmandir | retailer_rt0025@retailverse.com | password | 49 | 30 |
| Ratandeep | retailer_rt0026@retailverse.com | password | 50 | 31 |
| Reliance Smart | retailer_rt0027@retailverse.com | password | 51 | 32 |
| Shoppers Stop | retailer_rt0028@retailverse.com | password | 52 | 33 |
| Sodhi Super Strores | retailer_rt0029@retailverse.com | password | 53 | 34 |
| Spar | retailer_rt0030@retailverse.com | password | 54 | 35 |
| Spencers | retailer_rt0031@retailverse.com | password | 55 | 36 |
| TATA 1MG | retailer_rt0032@retailverse.com | password | 56 | 37 |
| Ushodiya | retailer_rt0033@retailverse.com | password | 57 | 38 |
| Vaibhav stores | retailer_rt0034@retailverse.com | password | 58 | 39 |
| Vijayetha | retailer_rt0035@retailverse.com | password | 59 | 40 |
| Walmart | retailer_rt0036@retailverse.com | password | 60 | 41 |
| Wellness Forever | retailer_rt0037@retailverse.com | password | 61 | 42 |
| WH Smith | retailer_rt0038@retailverse.com | password | 62 | 43 |
| Lots | retailer_rt0039@retailverse.com | password | 63 | 44 |

## SQL Import Order (CORRECTED FILES)
1. `01_Brand_Users_Correct.sql` - Create brand user accounts
2. `02_Retailer_Users_Correct.sql` - Create retailer user accounts  
3. `03_Brands_Correct.sql` - Create brand records linked to users
4. `04_Retailers_Correct.sql` - Create retailer records linked to users
5. `05_Products_Correct.sql` - Create product records linked to brands
6. `06_Retailer_Locations_Correct.sql` - Create retailer location records
7. `07_Retailer_Product_Mappings_Correct.sql` - Create retailer-product relationships

## Data Summary
- **10 Brands** with user accounts
- **39 Retailers** with user accounts (corrected names)
- **57 Products** linked to brands
- **2,423 Retailer Locations** across cities and states
- **723 Retailer-Product Mappings** with pricing and performance data

## Notes
- All passwords are hashed with bcrypt (hash: `$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi`)
- Plain text password for all users: `password`
- Brand passwords follow pattern: `{BRAND_NAME}@2024!`
- All data extracted directly from Excel file without any modifications
