-- Drop the problematic index that causes the error
DROP INDEX IF EXISTS idx_products_image_url;

-- Note: We don't need an index on image_url as it's not frequently queried
-- and the index can exceed PostgreSQL's 8KB row size limit for large URLs/base64 images