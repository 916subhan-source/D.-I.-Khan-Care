from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user

def require_role(role: str):
    """Dependency that ensures the logged‑in user has the given role.
    Usage example:
        @app.get("/download/doctor")
        async def endpoint(user = Depends(require_role("DOCTOR"))):
            ...
    """
    async def wrapper(current_user = Depends(get_current_user)):
        if getattr(current_user, "role", "").lower() != role.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to download this file."
            )
        return current_user
    return wrapper
