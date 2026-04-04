package com.habitai.habit;

import com.habitai.common.AppConstants;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/habits")
public class HabitController {

    private final HabitService habitService;

    public HabitController(HabitService habitService) {
        this.habitService = habitService;
    }

    @GetMapping("/all")
    public List<HabitDTO> getAllHabits() {
        return habitService.getAllHabits();
    }

    @GetMapping
    public List<HabitResponse> getHabitsForDate(@RequestParam(required = false) LocalDate date) {
        LocalDate targetDate = (date == null) ? LocalDate.now(AppConstants.APP_ZONE) : date;
        return habitService.getHabitsForDate(targetDate);
    }

    @GetMapping("/{habitId}")
    public HabitDTO getHabitById(@PathVariable long habitId) {
        return habitService.getHabitById(habitId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HabitDTO createHabit(@Valid @RequestBody HabitRequest habitRequest){
        return habitService.createHabit(habitRequest);
    }

    @PutMapping("/{habitId}")
    public ResponseEntity<Void> updateHabit(@PathVariable long habitId, @Valid @RequestBody HabitRequest habitRequest){
        habitService.updateHabit(habitId, habitRequest);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{habitId}")
    public ResponseEntity<Void> deleteHabit(@PathVariable Long habitId){
        habitService.deleteHabit(habitId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public Map<String, List<String>> getMonthSummary(@RequestParam int year, @RequestParam int month) {
        return habitService.getMonthSummary(year, month);
    }

    @PatchMapping("/{habitId}/pause")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void pauseHabit(@PathVariable long habitId, @RequestBody PauseRequest request) {
        habitService.pauseHabit(habitId, request);
    }

    @PatchMapping("/{habitId}/resume")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resumeHabit(@PathVariable long habitId) {
        habitService.resumeHabit(habitId);
    }
}