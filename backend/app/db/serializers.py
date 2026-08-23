import datetime

def convert_datetime_to_realword(dt: datetime.datetime) -> str:
    return dt.replace(tzinfo=datetime.timezone.utc).isoformat().replace("+00:00", "Z")

def convert_field_to_camel_case(string: str) -> str:
    return "".join(
        word.capitalize() if index != 0 else word
        for index, word in enumerate(string.split("_"))
    )

class ModelSerializer:
    @staticmethod
    def to_dict(obj, include_relationships=True):
        if not hasattr(obj, "__table__"):
            raise ValueError("Provided object is not a SQLAlchemy model instance.")

        # Convert columns to dictionary with camel-case field names
        data = {
            convert_field_to_camel_case(column.name): getattr(obj, column.name)
            for column in obj.__table__.columns
        }

        # Optionally include relationships
        if include_relationships:
            for relationship in obj.__mapper__.relationships:
                related_obj = getattr(obj, relationship.key)

                # Camel-case the relationship key
                relationship_key = convert_field_to_camel_case(relationship.key)

                if related_obj is None:
                    data[relationship_key] = None
                elif isinstance(related_obj, list):  # For one-to-many relationships
                    data[relationship_key] = [ModelSerializer.to_dict(item, False) for item in related_obj]
                else:  # For many-to-one or one-to-one relationships
                    data[relationship_key] = ModelSerializer.to_dict(related_obj, False)

        return data
