using Microsoft.EntityFrameworkCore;
using TimesheetBlogMeeting.API.Models;

namespace TimesheetBlogMeeting.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<TimesheetEntry> TimesheetEntries => Set<TimesheetEntry>();
    public DbSet<TimesheetPerson> TimesheetPeople => Set<TimesheetPerson>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<LeaveColumn> LeaveColumns => Set<LeaveColumn>();
    public DbSet<LeaveRow> LeaveRows => Set<LeaveRow>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Guid PKs — generated on add (client-side, works with SQLite)
        modelBuilder.Entity<User>().Property(u => u.Id).ValueGeneratedOnAdd();
        modelBuilder.Entity<BlogPost>().Property(b => b.Id).ValueGeneratedOnAdd();
        modelBuilder.Entity<TimesheetEntry>().Property(t => t.Id).ValueGeneratedOnAdd();
        modelBuilder.Entity<TimesheetPerson>().Property(t => t.Id).ValueGeneratedOnAdd();
        modelBuilder.Entity<Meeting>().Property(m => m.Id).ValueGeneratedOnAdd();
        modelBuilder.Entity<LeaveColumn>().Property(l => l.Id).ValueGeneratedOnAdd();
        modelBuilder.Entity<LeaveRow>().Property(l => l.Id).ValueGeneratedOnAdd();

        // Username là duy nhất
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Email là duy nhất (bỏ qua các bản ghi NULL — tài khoản nội bộ không có email)
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique()
            .HasFilter("[Email] IS NOT NULL");

        // Khi xoá user thì xoá luôn các bài blog của user đó
        modelBuilder.Entity<BlogPost>()
            .HasOne(b => b.Author)
            .WithMany(u => u.BlogPosts)
            .HasForeignKey(b => b.AuthorId)
            .OnDelete(DeleteBehavior.Cascade);

        // Khi xoá user thì xoá luôn các lịch họp của user đó
        modelBuilder.Entity<Meeting>()
            .HasOne(m => m.CreatedBy)
            .WithMany(u => u.Meetings)
            .HasForeignKey(m => m.CreatedById)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
