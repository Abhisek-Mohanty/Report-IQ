from app.models.domain.rwmodel import RWModel, Base


class RWSchema(RWModel):
    class Config(RWModel.Config):
        from_attributes = True

Base = Base