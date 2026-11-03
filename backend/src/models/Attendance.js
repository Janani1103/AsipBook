import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeCode: String,
    employeeName: String,

    date: { type: Date, required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },

    checkInTime: Date,
    checkOutTime: Date,
    totalWorkedMinutes: { type: Number, default: 0 },

    lateMinutes: { type: Number, default: 0 },
    earlyLeaveMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },

    status: {
        type: String,
        enum: [
            'present', 'absent', 'half_day',
            'leave', 'holiday', 'weekend', 'late',
        ],
        default: 'present',
    },

    leaveId: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveRequest' },
    leaveType: String,

    checkInMethod: { type: String, enum: ['manual', 'biometric', 'mobile', 'web'], default: 'manual' },
    location: { latitude: Number, longitude: Number, address: String },

    notes: String,

    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Unique: one attendance record per employee per date
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;