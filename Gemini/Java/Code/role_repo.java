package com.example.authapp.repository;

import com.example.authapp.model.Role;
import com.example.authapp.model.Role.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}
