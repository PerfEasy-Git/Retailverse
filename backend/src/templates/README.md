# Excel Templates

This directory contains Excel template files for data import.

## Template Structure

### retailer-data-template.xlsx
Contains the following sheets:
- **RETAILER_INFO**: Retailer details
- **PRODUCT_INFO**: Product information  
- **RETAILER_LOCATION**: Retailer locations
- **RETAILER_PRODUCT_MAPPING**: Product-retailer mappings

## Usage
1. Download the template from the Data Import screen
2. Fill in your data following the column structure
3. Upload the completed file

## Column Requirements

### RETAILER_INFO Sheet
- retailer_id (required)
- retailer_name (required)
- retailer_type (required)
- category (required)
- sub_category (required)
- purchase_model (required)
- trade_margin (required)
- asp (required)
- pack_size (required)
- uom (required)
- value (required)

### PRODUCT_INFO Sheet
- product_id (required)
- brand_name (required)
- product_description (required)
- category (required)
- sub_category (required)
- mrp (required)
- pack_size (required)
- uom (required)
- value (required)

### RETAILER_LOCATION Sheet
- retailer_id (required)
- city (required)
- state (required)

### RETAILER_PRODUCT_MAPPING Sheet
- retailer_id (required)
- product_id (required)
