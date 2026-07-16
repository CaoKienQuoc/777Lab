using System.ComponentModel.DataAnnotations;

namespace TimesheetBlogMeeting.API.DTOs;

public class RegulationFormRequest
{
    [Required, MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    public IFormFile? Image { get; set; }

    public bool RemoveImage { get; set; } = false;

    public string? ScheduledDate { get; set; }
    public string? ScheduledTime { get; set; }
}

public class RegulationResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ScheduledAt { get; set; }
}
