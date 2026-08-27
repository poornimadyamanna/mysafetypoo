# API Response Messages

This document lists all success and error messages used across the application.

## Success Messages

### Authentication
- `otp_sent` - OTP sent successfully
- `login_success` - Login successful
- `token_refreshed` - Token refreshed successfully
- `logout_success` - Logout successful

### User Management
- `profile_fetched` - User profile retrieved
- `profile_updated` - Profile updated successfully
- `all_users` - All users retrieved
- `user_details` - User details retrieved
- `user_updated` - User updated successfully
- `user_activated` - User activated
- `user_deactivated` - User deactivated

### Address
- `address_created` - Address created successfully
- `addresses_retrieved` - Addresses retrieved
- `address_retrieved` - Address retrieved
- `address_updated` - Address updated successfully
- `address_deleted` - Address deleted successfully
- `default_address_retrieved` - Default address retrieved

### QR Management
- `qr_batch_generated` - QR batch generated successfully
- `qr_inventory_retrieved` - QR inventory retrieved
- `qr_assigned_successfully` - QR assigned successfully
- `qrs_retrieved` - QRs retrieved
- `qr_suspended` - QR suspended
- `qr_reactivated` - QR reactivated
- `purchased_qrs_retrieved` - Purchased QRs retrieved
- `qr_resolved` - QR resolved successfully
- `qr_kit_generated` - QR kit generated

### Vehicle
- `vehicle_created` - Vehicle created successfully
- `vehicles_retrieved` - Vehicles retrieved
- `vehicle_details_retrieved` - Vehicle details retrieved
- `vehicle_updated` - Vehicle updated successfully
- `vehicle_deleted` - Vehicle deleted successfully
- `alerts_retrieved` - Alerts retrieved
- `alert_resolved` - Alert resolved
- `vehicle_insurance` - Vehicle insurance retrieved
- `vehicle_rc_fetched` - Vehicle RC fetched

### Members & Drivers
- `member_created` - Member created successfully
- `member_list` - Member list retrieved
- `member_updated` - Member updated successfully
- `member_deleted` - Member deleted successfully
- `driver_created` - Driver created successfully
- `driver_list` - Driver list retrieved
- `driver_updated` - Driver updated successfully
- `driver_deleted` - Driver deleted successfully
- `driver_mapped` - Driver mapped successfully
- `driver_unmapped` - Driver unmapped successfully
- `vehicle_driver_fetched` - Vehicle driver fetched

### Emergency Contacts
- `contacts_fetched` - Contacts fetched successfully
- `contact_added` - Contact added successfully
- `contact_updated` - Contact updated successfully
- `contact_deleted` - Contact deleted successfully
- `contacts_updated` - Contacts updated successfully
- `vehicle_contacts_fetched` - Vehicle contacts fetched

### DoorBell/House
- `house_created_successfully` - House created successfully
- `houses_retrieved` - Houses retrieved
- `house_updated_successfully` - House updated successfully
- `house_deleted_successfully` - House deleted successfully
- `house_members_updated_successfully` - House members updated successfully
- `house_members_retrieved` - House members retrieved
- `visits_retrieved` - Visits retrieved
- `frozen_members_reassigned` - Frozen members reassigned

### Lost & Found
- `item_created` - Item created successfully
- `items_retrieved` - Items retrieved
- `item_updated` - Item updated successfully
- `item_deleted` - Item deleted successfully
- `events_retrieved` - Events retrieved
- `event_status_updated` - Event status updated
- `lost_found_events_success` - Lost found events retrieved

### Documents
- `document_uploaded_successfully` - Document uploaded successfully
- `documents_retrieved` - Documents retrieved
- `categories_retrieved` - Categories retrieved
- `document_deleted_successfully` - Document deleted successfully
- `digilocker_connect_url_success` - DigiLocker connect URL generated
- `digilocker_documents_fetched` - DigiLocker documents fetched
- `digilocker_demo_pan_pulled` - DigiLocker demo PAN pulled
- `digilocker_demo_issued_docs` - DigiLocker demo issued docs
- `digilocker_demo_file` - DigiLocker demo file
- `digilocker_demo_eaadhaar` - DigiLocker demo eAadhaar

### Calls (Agora)
- `call_started` - Call started successfully
- `joined_call` - Joined call successfully
- `token_generated` - Token generated successfully
- `call_ended` - Call ended successfully
- `usage_retrieved` - Usage retrieved
- `calls_retrieved` - Calls retrieved
- `chat_rooms_retrieved` - Chat rooms retrieved
- `messages_retrieved` - Messages retrieved

### Chat
- `chat_room_retrieved` - Chat room retrieved
- `chats_retrieved` - Chats retrieved
- `chat_room_created` - Chat room created

### Cart & Orders
- `cart_updated` - Cart updated successfully
- `cart_retrieved` - Cart retrieved
- `cart_cleared` - Cart cleared
- `order_created` - Order created successfully
- `payment_status_updated` - Payment status updated
- `order_fulfilled` - Order fulfilled
- `orders_retrieved` - Orders retrieved
- `order_retrieved` - Order retrieved
- `order_status_updated` - Order status updated
- `order_cancelled` - Order cancelled
- `inventory_retrieved` - Inventory retrieved
- `statistics_retrieved` - Statistics retrieved
- `qrs_retrieved` - QRs retrieved
- `razorpay_order_created` - Razorpay order created
- `payment_verified` - Payment verified
- `payment_already_completed` - Payment already completed
- `payment_not_initiated` - Payment not initiated
- `payment_pending` - Payment pending
- `payment_completed` - Payment completed
- `payment_status_fetched` - Payment status fetched
- `order_refunded` - Order refunded
- `payment_retry_ready` - Payment retry ready

### Subscription
- `subscription_retrieved` - Subscription retrieved
- `subscription_initiated` - Subscription initiated
- `subscription_activated` - Subscription activated
- `subscription_cancelled` - Subscription cancelled
- `subscription_plans_retrieved` - Subscription plans retrieved
- `subscription_synced` - Subscription synced
- `subscription_plan_created` - Subscription plan created
- `subscription_plan_updated` - Subscription plan updated
- `subscription_plan_deleted` - Subscription plan deleted

### Pricing
- `pricing_saved` - Pricing saved
- `pricing_retrieved` - Pricing retrieved
- `price_calculated` - Price calculated
- `pricing_deleted` - Pricing deleted

### SmartCard
- `smartcard_created` - SmartCard created
- `smartcards_retrieved` - SmartCards retrieved
- `smartcard_updated` - SmartCard updated
- `smartcard_deleted` - SmartCard deleted
- `analytics_retrieved` - Analytics retrieved

### Predefined Messages
- `predefined_message_created_successfully` - Predefined message created
- `predefined_messages_retrieved` - Predefined messages retrieved
- `predefined_message_updated_successfully` - Predefined message updated
- `predefined_message_deleted_successfully` - Predefined message deleted
- `predefined_messages` - Predefined messages retrieved

### Content Management
- `content_retrieved` - Content retrieved
- `content_updated_successfully` - Content updated successfully

### Audio
- `app_modules_success` - App modules retrieved
- `audio_created_successfully` - Audio created successfully
- `audio_updated_successfully` - Audio updated successfully
- `audio_deleted_successfully` - Audio deleted successfully

### Master Data
- `app_content_success` - App content retrieved
- `app_language_success` - App language retrieved
- `app_modules_success` - App modules retrieved

### Maps
- `address_retrieved` - Address retrieved
- `suggestions_retrieved` - Suggestions retrieved
- `place_details_retrieved` - Place details retrieved

### Device Tokens
- `device_registered` - Device registered
- `device_removed` - Device removed

### Upload
- `file_upload_success` - File uploaded successfully

### Blocked Visitors
- `visitor_blocked_successfully` - Visitor blocked successfully
- `visitor_unblocked_successfully` - Visitor unblocked successfully
- `blocked_visitors_retrieved` - Blocked visitors retrieved

### Visitor
- `otp_sent` - OTP sent to visitor
- `otp_verified` - OTP verified
- `apisetu_callback` - API Setu callback received

### TOTP (Two-Factor Authentication)
- `totp.setup_initiated` - TOTP setup initiated
- `totp.enabled` - TOTP enabled
- `totp.disabled` - TOTP disabled
- `totp.backup_code_verified` - Backup code verified
- `totp.qr_retrieved` - TOTP QR retrieved

### Analytics
- `dashboard_stats_retrieved` - Dashboard stats retrieved
- `module_stats_retrieved` - Module stats retrieved
- `user_growth_retrieved` - User growth retrieved
- `revenue_growth_retrieved` - Revenue growth retrieved
- `qr_usage_stats_retrieved` - QR usage stats retrieved
- `call_stats_retrieved` - Call stats retrieved
- `top_users_retrieved` - Top users retrieved
- `subscription_stats_retrieved` - Subscription stats retrieved

### Scan
- `subscription_features_retrieved` - Subscription features retrieved
- `auto_call_initiation_success` - Auto call initiation success

### Transactions
- `transactions_retrieved` - Transactions retrieved
- `transaction_details_retrieved` - Transaction details retrieved

---

## Error Messages

### Authentication Errors
- `unauthorized_missing_token` - Missing authentication token
- `token_invalid_signature` - Invalid token signature
- `unauthorized_user_not_found` - User not found
- `session_expired` - Session expired
- `unauthorized_invalid_token` - Invalid token
- `access_denied_invalid_role` - Access denied - invalid role
- `unauthorized` - Unauthorized access
- `missing_id_token` - Missing ID token
- `Phone number is required` - Phone number required
- `You have reached the OTP limit. Please try again after 1 hour.` - OTP limit exceeded
- `Phone and OTP are required` - Phone and OTP required
- `User not found` - User not found
- `OTP not found` - OTP not found
- `Invalid OTP` - Invalid OTP
- `OTP expired` - OTP expired
- `Unauthorized. Token not found.` - Token not found
- `Invalid session or user not found.` - Invalid session
- `No refresh token found. Please login again.` - No refresh token
- `Session expired. Please login again.` - Session expired
- `Invalid session` - Invalid session
- `Authentication failed` - Authentication failed

### User Errors
- `user_not_found` - User not found
- `user_update_failed` - User update failed
- `phone_already_in_use` - Phone already in use
- `invalid_or_same_email` - Invalid or same email
- `email_already_in_use` - Email already in use
- `invalid_token` - Invalid token
- `invalid_or_expired_token` - Invalid or expired token

### Address Errors
- `address_not_found` - Address not found

### QR Errors
- `QR_NOT_FOUND` - QR not found
- `qr_not_found` - QR not found
- `qr_not_found_or_already_assigned` - QR not found or already assigned
- `qr_not_owned_by_user` - QR not owned by user
- `qr_not_ready_for_activation` - QR not ready for activation
- `qr_expired_purchase_required` - QR expired, purchase required
- `qr_frozen` - QR is frozen
- `qr_inactive` - QR is inactive
- `scanner_too_far_from_location` - Scanner too far from location
- `missing_required_fields` - Missing required fields
- `invalid_qr_selection` - Invalid QR selection

### Vehicle Errors
- `vehicle_not_found` - Vehicle not found
- `vehicle_data_not_found` - Vehicle data not found
- `chassis_number_mismatch` - Chassis number mismatch
- `vehicle_get_failed` - Failed to get vehicle
- `vehicle_details_get_failed` - Failed to get vehicle details
- `already_present_with_this_vehicle_number` - Vehicle number already exists
- `vehicle_not_found_with_this_vehicle_number` - Vehicle not found with this number
- `vehicleNumber and chassisNumber are required` - Required fields missing
- `vehicleNumber, model, and vehicleType are required` - Required fields missing
- `vehicle_insurance_expired_or_not_found` - Vehicle insurance expired or not found
- `vehicle_insurance_get_failed` - Failed to get vehicle insurance
- `no_emergency_contacts` - No emergency contacts
- `auto_call_initiation_failed` - Auto call initiation failed
- `smart_card_not_found` - Smart card not found
- `smart_card_get_failed` - Failed to get smart card
- `vehicle_challan_not_found` - Vehicle challan not found
- `vehicle_challan_fetch_failed` - Failed to fetch vehicle challan
- `regNo and chassisNo are required` - Required fields missing
- `transport_rc_fetch_failed` - Failed to fetch transport RC
- `third_party_vehicle_fetch_failed` - Failed to fetch vehicle from third party

### Member & Driver Errors
- `member_not_found` - Member not found
- `cannot_add_self_as_member` - Cannot add self as member
- `member_add_failed` - Failed to add member
- `member_already_exists` - Member already exists
- `member_get_failed` - Failed to get members
- `member_delete_failed` - Failed to delete member
- `driver_not_found` - Driver not found
- `driver_add_failed` - Failed to add driver
- `driver_get_failed` - Failed to get drivers
- `driver_update_failed` - Failed to update driver
- `driver_delete_failed` - Failed to delete driver
- `Driver not found` - Driver not found
- `Driver already assigned to another vehicle` - Driver already assigned

### Emergency Contact Errors
- `Vehicle not found` - Vehicle not found
- `Some contacts not found` - Some contacts not found
- `Contact not found` - Contact not found

### DoorBell/House Errors
- `house_not_found` - House not found
- `house_get_failed` - Failed to get house
- `you_dont_have_permission_to_perform_this_operation` - Permission denied
- `family_member_limit_exceeded:{limit}` - Family member limit exceeded
- `house_members_get_failed` - Failed to get house members
- `free_users_can_reassign_max_2_members` - Free users can reassign max 2 members
- `invalid_frozen_member_ids` - Invalid frozen member IDs

### Lost & Found Errors
- `item_not_found` - Item not found
- `lostfound_get_failed` - Failed to get lost & found items
- `event_not_found` - Event not found

### Document Errors
- `document_not_found` - Document not found
- `invalid_document_category` - Invalid document category
- `document_already_exists_for_category` - Document already exists for category
- `vehicle_id_or_number_required` - Vehicle ID or number required
- `document_get_failed` - Failed to get documents
- `document_delete_failed` - Failed to delete document
- `digilocker_uri_required` - DigiLocker URI required
- `digilocker_link_failed` - Failed to link DigiLocker
- `panNo is required` - PAN number required
- `digilocker_pull_no_uri` - DigiLocker pull no URI
- `digilocker_pull_failed` - DigiLocker pull failed
- `digilocker_get_file_failed` - Failed to get DigiLocker file
- `digilocker_issued_docs_failed` - Failed to get issued docs
- `digilocker_eaadhaar_failed` - Failed to get eAadhaar
- `digilocker_token_exchange_failed` - Token exchange failed
- `digilocker_not_linked` - DigiLocker not linked
- `digilocker_refresh_token_missing` - Refresh token missing
- `digilocker_refresh_failed` - Refresh failed
- `digilocker_fetch_issued_failed` - Failed to fetch issued docs
- `digilocker_download_failed` - Download failed
- `uri query param is required` - URI query param required

### Call Errors
- `CALL_SESSION_NOT_FOUND` - Call session not found
- `CALL_NOT_ACTIVE` - Call not active
- `CALL_TIME_OVER` - Call time over
- `VISITOR_BLOCKED` - Visitor blocked
- `OWNER_REQUIRES_AUTH` - Owner requires authentication
- `NOT_OWNER` - Not owner
- `FAMILY_REQUIRES_AUTH` - Family requires authentication
- `NOT_FAMILY_MEMBER` - Not family member
- `FAMILY_JOIN_REQUIRES_PREMIUM` - Family join requires premium
- `MAX_PARTICIPANTS_REACHED` - Max participants reached
- `PARTICIPANT_NOT_FOUND` - Participant not found
- `call_session_not_found` - Call session not found
- `Invalid module type` - Invalid module type
- `Profile not found` - Profile not found
- `Unauthorized` - Unauthorized
- `Room not found` - Room not found
- `call_id_required` - Call ID required
- `invalid_input` - Invalid input

### Chat Errors
- `Chat room not found` - Chat room not found
- `Unauthorized` - Unauthorized
- `Unauthorized family member` - Unauthorized family member
- `Invalid qrId: {qrId}` - Invalid QR ID
- `Invalid moduleProfileId: {moduleProfileId}` - Invalid module profile ID
- `Invalid eventId: {eventId}` - Invalid event ID
- `Invalid scannerId: {scannerId}` - Invalid scanner ID
- `Invalid ownerId: {ownerId}` - Invalid owner ID

### Cart & Order Errors
- `missing_required_fields` - Missing required fields
- `insufficient_qr_stock_{moduleType}: only {availableQRs} available` - Insufficient QR stock
- `reorder_requires_single_item_and_qrId` - Reorder requires single item and QR ID
- `order_not_found` - Order not found
- `payment_not_completed` - Payment not completed
- `order_already_fulfilled` - Order already fulfilled
- `cannot_cancel_completed_order` - Cannot cancel completed order
- `unauthorized` - Unauthorized
- `order_not_completed` - Order not completed
- `order_already_refunded` - Order already refunded
- `order_not_paid` - Order not paid
- `refund_amount_exceeds_order_total` - Refund amount exceeds order total
- `order_already_paid` - Order already paid
- `order_cancelled` - Order cancelled
- `invalid_payment_signature` - Invalid payment signature

### Subscription Errors
- `subscription_not_found` - Subscription not found
- `plan_id_required` - Plan ID required
- `missing_payment_details` - Missing payment details
- `already_premium_subscriber` - Already premium subscriber
- `pending_subscription_exists` - Pending subscription exists
- `invalid_plan` - Invalid plan
- `razorpay_plan_not_configured` - Razorpay plan not configured
- `user_not_found` - User not found
- `invalid_signature` - Invalid signature
- `payment_already_processed` - Payment already processed
- `payment_not_found` - Payment not found
- `payment_failed` - Payment failed
- `no_active_premium_subscription` - No active premium subscription
- `razorpay_subscription_id_missing` - Razorpay subscription ID missing

### Pricing Errors
- `invalid_module_type` - Invalid module type
- `pricing_not_found` - Pricing not found

### SmartCard Errors
- `smartcard_not_found` - SmartCard not found
- `smartcard_or_link_not_found` - SmartCard or link not found

### Predefined Message Errors
- `message_not_found_or_unauthorized` - Message not found or unauthorized
- `messages_get_failed` - Failed to get messages
- `message_delete_failed` - Failed to delete message
- `message_not_found` - Message not found

### Content Errors
- `field_required` - Field required
- `field_and_translations_required` - Field and translations required
- `content_get_failed` - Failed to get content

### Audio Errors
- `app_modules_not_found` - App modules not found
- `audio_not_found` - Audio not found
- `audioRecording_not_found` - Audio recording not found

### Master Data Errors
- `app_content_not_found` - App content not found
- `app_language_not_found` - App language not found
- `app_modules_not_found` - App modules not found

### Maps Errors
- `lat_and_lng_required` - Latitude and longitude required
- `input_required` - Input required
- `place_id_required` - Place ID required
- `geocoding_failed` - Geocoding failed
- `address_not_found` - Address not found
- `autocomplete_failed` - Autocomplete failed
- `place_details_failed` - Place details failed

### Device Token Errors
- `fcmToken, deviceId, and platform are required` - Required fields missing

### Upload Errors
- `no_file_uploaded` - No file uploaded
- `upload_failed` - Upload failed

### Blocked Visitor Errors
- `visitor_not_blocked` - Visitor not blocked

### Visitor Errors
- `qrId_required` - QR ID required
- `visitor_not_found` - Visitor not found
- `invalid_otp` - Invalid OTP
- `otp_expired` - OTP expired
- `otp_tries_exceeded` - OTP tries exceeded

### TOTP Errors
- `admin.unauthorized` - Admin unauthorized
- `totp.already_enabled` - TOTP already enabled
- `totp.token_required` - TOTP token required
- `totp.setup_required` - TOTP setup required
- `totp.invalid_token` - Invalid TOTP token
- `totp.not_enabled` - TOTP not enabled
- `totp.code_required` - TOTP code required
- `totp.invalid_backup_code` - Invalid backup code
- `server.error` - Server error

### Scan Errors
- `visit_not_found` - Visit not found

### Transaction Errors
- `invalid_transaction_id` - Invalid transaction ID
- `transaction_not_found` - Transaction not found

### Generic Errors
- `something_went_wrong` - Something went wrong
- `internal_server_error` - Internal server error
- `field_required` - Field required
