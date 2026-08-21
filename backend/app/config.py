from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    brightdata_api_key: str
    brightdata_job_collector_id: str = ""
    brightdata_company_collector_id: str = ""
    openai_api_key: str
    openai_model: str = "gpt-5.6-sol"
    # Comma separated list of extra origins allowed to call the API.
    allowed_origins: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
