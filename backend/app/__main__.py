import argparse
from getpass import getpass

from pydantic import EmailStr, TypeAdapter

from .config import Settings
from .database import Store
from .security import set_admin


def main():
    parser = argparse.ArgumentParser(description="Provision or reset a Dev Club administrator account")
    parser.add_argument("command", choices=["create-admin"])
    parser.add_argument("email")
    args = parser.parse_args()
    email = str(TypeAdapter(EmailStr).validate_python(args.email))
    password = getpass("Password (at least 12 characters): ")
    if password != getpass("Confirm password: "):
        parser.error("Passwords do not match")
    store = Store(Settings())
    store.initialize()
    try:
        set_admin(store, email, password)
    except ValueError as error:
        parser.error(str(error))
    print(f"Administrator {email} saved. Existing sessions revoked.")


if __name__ == "__main__":
    main()
