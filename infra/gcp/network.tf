# Private Services Access (PSA) bootstrap for Cloud SQL private-IP connectivity.
#
# Per architecture §5.8 line 3235-3277 ("Cloud SQL has no public IP"), the
# Cloud SQL instance lives on a private IP inside the project's VPC. PSA
# requires a reserved global IP range + a service-networking peering — both
# managed here.
#
# Apply this stack ONCE per environment; the peering is cross-project (between
# the customer VPC and the Google-managed services VPC) and is idempotent.

resource "google_compute_global_address" "private_ip_range" {
  name          = local.psa_range_name
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = local.network_self_link
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = local.network_self_link
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}
