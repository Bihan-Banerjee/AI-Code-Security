public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}
