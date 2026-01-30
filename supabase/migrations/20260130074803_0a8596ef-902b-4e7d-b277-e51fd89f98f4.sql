-- Fix search_path security issue for generate_invoice_number function
ALTER FUNCTION public.generate_invoice_number(uuid, uuid) SET search_path = public;