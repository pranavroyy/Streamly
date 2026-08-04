package com.streamly.backend.room.repository;

import com.streamly.backend.room.entity.Room;
import com.streamly.backend.room.entity.RoomStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findAllByOwnerIdAndStatusNot(Long ownerId, RoomStatus status);

    @Query("SELECT DISTINCT r FROM Room r LEFT JOIN FETCH r.owner LEFT JOIN FETCH r.participants p LEFT JOIN FETCH p.user WHERE (r.owner.id = :userId OR p.user.id = :userId) AND r.status <> :excludedStatus ORDER BY r.createdAt DESC")
    List<Room> findUserRoomsExcludingStatus(@Param("userId") Long userId, @Param("excludedStatus") RoomStatus excludedStatus);

    boolean existsByCode(String code);

    Optional<Room> findByCode(String code);

    @Query("SELECT DISTINCT r FROM Room r LEFT JOIN FETCH r.owner LEFT JOIN FETCH r.participants p LEFT JOIN FETCH p.user WHERE r.code = :code AND r.status <> :excludedStatus")
    Optional<Room> findByCodeAndStatusNot(@Param("code") String code, @Param("excludedStatus") RoomStatus excludedStatus);

    @Query("SELECT DISTINCT r FROM Room r LEFT JOIN FETCH r.owner LEFT JOIN FETCH r.participants p LEFT JOIN FETCH p.user WHERE r.id = :id AND r.status <> :excludedStatus")
    Optional<Room> findByIdAndStatusNot(@Param("id") Long id, @Param("excludedStatus") RoomStatus excludedStatus);
}
