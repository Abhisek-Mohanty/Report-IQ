Quickstart
----------

Python FastAPI
----------------------

Then create ``.env`` file (or rename and modify ``.env.example``) in project root and set environment variables for application: ::
    
    HOST=mysql host  127.0.0.1 
    PORT=mysql port 3306 
    USER=mysql user root
    PWD=mysql pwd root
    DB=mysql db fastapi

To run the web application in debug use init mysql db: ::

    uvicorn app.main:app --reload --header server:TechFinoMSME


Deployment with Docker
----------------------

You must have ``docker`` and ``docker-compose`` tools installed to work with material in this section.
First, create ``.env`` file like in `Quickstart` section or modify ``.env.example``.
``POSTGRES_HOST`` must be specified as `db` or modified in ``docker-compose.yml`` also.
Then just run::

    docker-compose up -d db
    docker-compose up -d app

Application will be available on ``localhost`` in your browser.

Web routes
----------

All routes are available on ``/docs`` or ``/redoc`` paths with Swagger or ReDoc.


Project structure
-----------------

Files related to application are in the ``app`` or ``tests`` directories.
Application parts are:

::

    app
    ├── api              - web related stuff.
    │   ├── dependencies - dependencies for routes definition.
    │   ├── errors       - definition of error handlers.
    │   └── routes       - web routes.
    ├── core             - application configuration, startup events, logging.
    ├── db               - db related stuff.
    │   ├── migrations   - manually written alembic migrations.
    │   └── repositories - all crud stuff.
    ├── models           - pydantic models for this application.
    │   ├── domain       - main models that are used almost everywhere.
    │   └── schemas      - schemas for using in web routes.
    ├── resources        - constant, messages and strings that are used in web responses and application.
    │   ├── library      - library that are used almost everywhere.
    ├── services         - logic that is not just crud related.
    └── main.py          - FastAPI application creation and configuration.
