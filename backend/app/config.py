from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    brightdata_api_key: str
    brightdata_job_collector_id: str = ""
    brightdata_company_collector_id: str = ""
    openai_api_key: str
    openai_model: str = "gpt-5.6-sol"
    # Comma separated list of extra origins allowed to call the API.
    allowed_origins: str = ""

    # Supabase project + Postgres connection (Phase 1). Blank until the
    # project exists; auth/DB routes stay disabled until these are set.
    supabase_url: str = ""
    supabase_jwt_aud: str = "authenticated"
    supabase_service_role_key: str = ""
    database_url: str = ""

    # Anonymous usage-limit signing (Phase 3).
    cookie_signing_secret: str = ""
    ip_hash_salt: str = ""

    # Stripe billing (Phase 4).
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_basic: str = ""
    stripe_price_id_premium: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
