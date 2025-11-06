# Recent Changes Summary

## Invoice Page
- ✅ **Fixed tax display**: Invoices now correctly show item tax percentages (handles cgst+sgst or igst)
- ✅ **Added calendar filter**: Replaced dropdown with date input for precise date filtering

## Modern Billing Component
- ✅ **Fixed stock reduction**: Stock now properly decreases after each sale with fresh data fetch
- ✅ **Added loyalty points fetching**: Customer loyalty points display when phone number entered
- ✅ **Improved layout scrolling**: 
  - Products grid has scrollbar (max-height: calc(100vh-130px))
  - Cart items section has no scrollbar for better UX
- ✅ **Fixed bill format selector**: Using thermal/A4 dropdown at top right (not templates)

## PDF Invoice Generation
- ✅ **Thermal bills**: Now show tax percentage below each item and GST splitup (SGST/CGST or IGST)
- ✅ **A4 bills**: Display proper tax percentages calculated from cgst+sgst or igst
- ✅ **GST breakdown**: Both formats show complete tax breakdown including:
  - Product SGST/CGST or IGST
  - Additional GST if applied
  - Total tax amounts

## Templates Page
- ✅ **15 color themes available** (more than requested 10):
  1. Classic Professional (Blue)
  2. Modern Minimal (Green)
  3. Bold Business (Red)
  4. Elegant Corporate (Purple)
  5. Compact Economy (Orange)
  6. Ocean Blue
  7. Warm Sunset
  8. Forest Green
  9. Royal Purple
  10. Monochrome Pro
  11. Midnight Blue
  12. Rose Gold
  13. Teal Modern
  14. Slate Corporate
  15. Amber Warmth
- Each template includes full preview with company header, items table, and totals
- Active template is highlighted with checkmark
- One-click activation for any template

## Customers Page
- ✅ **Loyalty points display**: Shows correct points and spending amounts
- Data fetched with proper user filtering (created_by)
- Displays "0 pts" for customers without loyalty data (correct behavior)

## Technical Improvements
- All tax calculations properly handle intra-state (IGST) vs inter-state (SGST+CGST) trade
- Number formatting uses Indian number system throughout
- Responsive design improvements for mobile view
- Better error handling and data validation
